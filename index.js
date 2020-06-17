#!/usr/bin/env node

const program = require ("commander");
const redis = require ("redis");
const promisify = require ("util").promisify;
const fs = require ("fs");
const chmodAsync = promisify (fs.chmod);
const pg = require ("pg");
const legacy = require ("./legacy");
const {error, execAsync, exist, writeFile, mkdirAsync} = require ("./common");
const {
	createModel,
	createProperty,
	createQuery,
	createColumn,
	createRecord,
	createDictionary,
	createTable,
	importCSV,
	exportCSV,
	executeScript,
	exportCLI
} = require ("./store");
const isWin = /^win/.test (process.platform);

async function checkRedis (opts) {
	try {
		let host = opts.redisHost || "127.0.0.1";
		let port = opts.redisPort || 6379;
		let redisClient = redis.createClient (port, host);
		
		redisClient.on ("error", function (err) {
			console.error ("\x1b[31m%s\x1b[0m", "Redis error:", err);
			process.exit (1);
		});
		redisClient.getAsync = promisify (redisClient.get);
		
		await redisClient.getAsync ("*");
		
		console.log ("\x1b[32m%s\x1b[0m", "Redis ok.");
		console.log ("Redis ok.");
	} catch (err) {
		throw new Error (`Redis error: ${err.message}`);
	}
};

async function checkPostgresPassword (opts) {
	try {
		let connection = `tcp://postgres:${opts.dbDbaPassword}@${opts.dbHost}:${opts.dbPort}/postgres`;
		let client = new pg.Client (connection);
		
		client.connectAsync = promisify (client.connect);
		client.queryAsync = promisify (client.query);
		
		await client.connectAsync ();
		await client.queryAsync ("select version ()");
		
		client.end ();

		console.log ("\x1b[32m%s\x1b[0m", `postgres ok: ${connection}`);
	} catch (err) {
		throw new Error (`postgres error: ${err.message}`);
	}
};

async function createPlatform (opts) {
	try {
		if (!opts.path) {
			throw new Error ("--path <path> not exist");
		}
		opts.objectumPort = opts.objectumPort || 8200;
		opts.redisHost = opts.redisHost || "127.0.0.1";
		opts.redisPort = opts.redisPort || 6379;
		opts.redisPort = opts.redisPort || 6379;
		
		await checkRedis (opts);
		
		if (await exist (`${opts.path}/server`)) {
			throw new Error (`Directory exists: ${opts.path}/server`);
		}
		if (await exist (`${opts.path}/server`)) {
			throw new Error (`Directory exists: ${opts.path}/server`);
		}
		await mkdirAsync (`${opts.path}/server`);

		if (!await exist (`${opts.path}/projects`)) {
			await mkdirAsync (`${opts.path}/projects`);
		}
		await execAsync ("npm i objectum", `${opts.path}/server`);
		
		writeFile (`${opts.path}/server/config.js`,
		`module.exports = {
	startPort: ${opts.objectumPort},
	redis: {
		host: "${opts.redisHost}",
		port: ${opts.redisPort}
	},
	query: {
		maxRowNum: 2000000,
		maxCount: 700000
	},
	log: {
		level: "info"
	},
	cluster: {
		www: {
			workers: 3
		},
		app: {
			workers: 3
		}
	},
	pool: {
		max: 20
	}
};
		`);
		writeFile (`${opts.path}/server/index-${opts.objectumPort}.js`, `require ("objectum").start (require ("./config"));`);
		writeFile (`${opts.path}/server/objectum.js`,
		`let Objectum = require ("objectum").Objectum;

module.exports = new Objectum (require ("./config"));
		`);
	} catch (err) {
		error (err.message);
	}
};

async function createProject (opts) {
	try {
		if (!opts.path) {
			throw new Error ("--path <path> not exist");
		}
		if (await exist (`${opts.path}/projects/${opts.createProject}`)) {
			throw new Error (`Directory exists: ${opts.path}/projects/${opts.createProject}`);
		}
		if (!await exist (`${opts.path}/server`)) {
			await createPlatform (opts);
		}
		let config = require (`${opts.path}/server/config.js`);
		
		opts.projectPort = opts.projectPort || 3100;
		opts.dbHost = opts.dbHost || "127.0.0.1";
		opts.dbPort = opts.dbPort || 5432;
		opts.dbDbPassword = opts.dbDbPassword || "1";
		opts.dbDbaPassword = opts.dbDbaPassword || "12345";
		opts.password = require ("crypto").createHash ("sha1").update (opts.password || "admin").digest ("hex").toUpperCase ();
	
		await checkPostgresPassword (opts);
		await mkdirAsync (`${opts.path}/projects/${opts.createProject}`);
		await execAsync (`npm init react-app .`, `${opts.path}/projects/${opts.createProject}`);
		await execAsync (`npm install objectum-proxy objectum-react`, `${opts.path}/projects/${opts.createProject}`);
		
		writeFile (`${opts.path}/projects/${opts.createProject}/config.json`,
			`{
	"code": "${opts.createProject}",
	"adminPassword": "${opts.password}",
	"port": ${opts.projectPort},
	"database": {
		"host": "${opts.dbHost}",
		"port": ${opts.dbPort},
		"db": "${opts.createProject}",
		"dbUser": "${opts.createProject}",
		"dbPassword": "${opts.dbDbPassword}",
		"dbaUser": "postgres",
		"dbaPassword": "${opts.dbDbaPassword}"
	},
	"objectum": {
		"host": "127.0.0.1",
		"port": ${config.startPort}
	}
}
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/index-${opts.projectPort}.js`,
			`import Proxy from "objectum-proxy";
import fs from "fs";
import {fileURLToPath} from "url";
import {dirname} from "path";

const __filename = fileURLToPath (import.meta.url);
const __dirname = dirname (__filename);
const config = JSON.parse (fs.readFileSync ("./config.json", "utf8"));
const proxy = new Proxy ();

proxy.start ({config, path: "/api", __dirname});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/src/App.js`,
			`import React, {Component} from "react";
import {Store} from "objectum-client";
import {ObjectumApp} from "objectum-react";

import "objectum-react/lib/css/bootstrap.css";
import "objectum-react/lib/css/objectum.css";
import "objectum-react/lib/fontawesome/css/all.css";

const store = new Store ();

class App extends Component {
	constructor (props) {
		super (props);

		store.setUrl ("/api");
		window.store = store;
	}

	render () {
		return (
			<ObjectumApp
				store={store}
				name={process.env.REACT_APP_NAME || "${opts.createProject}"}
				version={process.env.REACT_APP_VERSION}
			/>
		);
	}
};

export default App;
		`);
		await mkdirAsync (`${opts.path}/projects/${opts.createProject}/bin`);
		await mkdirAsync (`${opts.path}/projects/${opts.createProject}/public/files`);
		await mkdirAsync (`${opts.path}/projects/${opts.createProject}/schema`);

		writeFile (`${opts.path}/projects/${opts.createProject}/bin/create.js`,
			`let $o = require ("../../../server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "create"${opts.dbPath ? `,\n\tpath: "${opts.dbPath}"\n` : ""}
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/remove.js`,
			`let $o = require ("../../../server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "remove"
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/import.js`,
			`let $o = require ("../../../server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "import",
	file: "schema-objectum.json"
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/export.js`,
			`let $o = require ("../../../server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "export",
	filterClasses: [],
	file: "../schema/schema-${opts.createProject}.json"
});
		`);
		let data = JSON.parse (fs.readFileSync (`${opts.path}/projects/${opts.createProject}/package.json`, "utf8"));
		
		data.type = "module";
		data.proxy = `http://localhost:${opts.projectPort}`;

		writeFile (`${opts.path}/projects/${opts.createProject}/package.json`, JSON.stringify (data, null, "\t"));
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/package.json`, "{}");
		
		//fs.unlinkSync (`${opts.path}/projects/${opts.createProject}/src/setupProxy.js`);
		
		await execAsync (`node ${opts.path}/projects/${opts.createProject}/bin/create.js`, `${opts.path}/projects/${opts.createProject}/bin`);
		await execAsync (`node ${opts.path}/projects/${opts.createProject}/bin/import.js`, `${opts.path}/projects/${opts.createProject}/bin`);
	} catch (err) {
		error (err.message);
	}
};

program
.version (require ("./package").version)
.option ("--path <path>", "Objectum path")
.option ("--create-platform", "Create platform")
.option ("--create-project <name>", "Create project")
//.option ("--remove-project <name>", "Remove project")
.option ("--redis-host <host>", "Redis server host. Default: 127.0.0.1")
.option ("--redis-port <port>", "Redis server port. Default: 6379")
.option ("--objectum-port <port>", "Objectum port. Default: 8200")
.option ("--project-port <port>", "Project port. Default: 3100")
.option ("--db-host <host>", "PostgreSQL server host. Default: 127.0.0.1")
.option ("--db-port <port>", "PostgreSQL server port. Default: 5432")
.option ("--db-dbPassword <password>", "User password of project database. Default: 1")
.option ("--db-dbaPassword <password>", "postgres password. Default: 12345")
.option ("--db-path <path>", "Optional tablespace directory")
.option ("--password <password>", "Project 'admin' password. Default: admin")
.option ("--create-model <JSON>", `Create model. Example: objectum-cli --create-model "{'name': 'Item', 'code': 'item'}"`)
.option ("--create-property <JSON>", `Create property. Example: objectum-cli --create-property "{'model': 'item', 'name': 'Name', 'code': 'name', 'type': 'string'}"`)
.option ("--create-query <JSON>", `Create query. Example: objectum-cli --create-query \"{'name': 'Items', 'code': 'item'}\"`)
.option ("--create-column <JSON>", `Create column. Example: objectum-cli --create-column "{'query': 'item', 'name': 'Name', 'code': 'name'}`)
.option ("--create-record <JSON>", `Create record. Example: objectum-cli --create-record "{'_model': 'item', 'name': 'Item 1'}"`)
.option ("--create-dictionary <JSON>", `Create dictionary in model. Example: objectum-cli --create-dictionary "{'name': 'Type', 'code': 'type'}" --model item`) // name, code
.option ("--create-table <JSON>", `Create table (tabular part) in model. Example: objectum-cli --create-table "{'name': 'Comment', 'code': 'comment'}" --model item`)
.option ("--import-csv <file>", "Import CSV file. Properties in 1st row. Delimiter \";\". Require --model.")
.option ("--export-csv <file>", "Export CSV file. Properties in 1st row. Delimiter \";\". Require --model.")
.option ("--model <model>", "Model")
.option ("--file <file>", "Execute JSON script (createModel: [...], createProperty: [...], createQuery: [], createRecord: [])")
.option ("--export-cli <file>", "Export CLI file. Models, properties, queries, columns.")
.option ("--create-nokod <code>", "Legacy option")
.option ("--site-key <key>", "Legacy option")
.option ("--secret-key <key>", "Legacy option")
.parse (process.argv);

async function start () {
	if (program ["path"]) {
		program ["path"] = program ["path"].split ("\\").join ("/");
	}
	if (program ["createPlatform"]) {
		await createPlatform (program);
		process.exit (1);
	} else if (program ["createProject"]) {
		await createProject (program);
		process.exit (1);
	} else if (program ["createModel"]) {
		await createModel (program);
		process.exit (1);
	} else if (program ["createProperty"]) {
		await createProperty (program);
		process.exit (1);
	} else if (program ["createQuery"]) {
		await createQuery (program);
		process.exit (1);
	} else if (program ["createColumn"]) {
		await createColumn (program);
		process.exit (1);
	} else if (program ["createRecord"]) {
		await createRecord (program);
		process.exit (1);
	} else if (program ["createDictionary"]) {
		await createDictionary (program);
		process.exit (1);
	} else if (program ["createTable"]) {
		await createTable (program);
		process.exit (1);
	} else if (program ["importCsv"]) {
		await importCSV (program);
		process.exit (1);
	} else if (program ["exportCsv"]) {
		await exportCSV (program);
		process.exit (1);
	} else if (program ["file"]) {
		await executeScript (program);
		process.exit (1);
	} else if (program ["exportCli"]) {
		await exportCLI (program);
		process.exit (1);
	} else if (program ["createNokod"]) {
		legacy.createNokod (program);
	} else {
		return program.outputHelp ();
	}
};
start ();
