#!/usr/bin/env node

/*
	npm i -g objectum-cli forever
 */
const program = require ("commander");
const redis = require ("redis");
const promisify = require ("util").promisify;
const fs = require ("fs");
const chmodAsync = promisify (fs.chmod);
const pg = require ("pg");
const legacy = require ("./legacy");
const {execAsync, exist, writeFile} = require ("./common");

function error (s) {
	console.error (s);
	process.exit (1);
};

async function checkRedis (opts) {
	try {
		let host = opts.redisHost || "127.0.0.1";
		let port = opts.redisPort || 6379;
		let redisClient = redis.createClient (port, host);
		
		redisClient.getAsync = promisify (redisClient.get);
		
		await redisClient.getAsync ("*");

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

		console.log (`postgres ok: ${connection}`);
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
		await execAsync (`mkdir -p ${opts.path}/server`);

		if (!await exist (`${opts.path}/projects`)) {
			await execAsync (`mkdir -p ${opts.path}/projects`);
		}
		await execAsync ("npm i objectum", `${opts.path}/server`);
		
		writeFile (`${opts.path}/server/config.js`,
		`module.exports = {
	rootDir: "${opts.path}/server",
	projectsDir: "${opts.path}/projects",
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
	}
};
		`);
		writeFile (`${opts.path}/server/index-${opts.objectumPort}.js`, `require ("objectum").start (require ("./config"));`);
		writeFile (`${opts.path}/server/objectum.js`,
		`let Objectum = require ("objectum").Objectum;

module.exports = new Objectum (require ("./config"));
		`);
		writeFile (`${opts.path}/server/start.sh`,
			`rm ${opts.path}/server/*.log
export NODE_ENV=production
forever start -a -l ${opts.path}/server/objectum.log -o /dev/null -e ${opts.path}/server/objectum-error.log --sourceDir ${opts.path}/server index-${opts.objectumPort}.js
	`);
		writeFile (`${opts.path}/server/stop.sh`,
			`forever stop ${opts.path}/server/index-${opts.objectumPort}.js
	`);
		await chmodAsync (`${opts.path}/server/start.sh`, 0o777);
		await chmodAsync (`${opts.path}/server/stop.sh`, 0o777);
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
		await execAsync (`mkdir -p ${opts.path}/projects/${opts.createProject}`);
		await execAsync (`npm init react-app .`, `${opts.path}/projects/${opts.createProject}`);
		await execAsync (`npm install express express-http-proxy objectum-client objectum-react`, `${opts.path}/projects/${opts.createProject}`);
		
		writeFile (`${opts.path}/projects/${opts.createProject}/config.json`,
			`{
	"code": "${opts.createProject}",
	"rootDir": "${opts.path}/projects/${opts.createProject}",
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
			`const config = require ("./config");
const path = require ("path");
const express = require ("express");
const proxy = require ("express-http-proxy");
const app = express ();

app.use (\`/api\`, proxy (\`http://127.0.0.1:${config.startPort}\`, {
	proxyReqPathResolver: function (req) {
		let parts = req.url.split('?');
		let queryString = parts [1] ? ("?" + parts [1]) : "";

		return "/projects/${opts.createProject}" + parts [0] + queryString;
	}
}));
app.use ("/public/*", proxy (\`http://127.0.0.1:${config.startPort}\`, {
	proxyReqPathResolver: function (req) {
		return req.baseUrl;
	}
}));
app.use (express.static (path.join (__dirname, "build")));
app.get ("/*", function (req, res) {
	res.sendFile (path.join (__dirname, "build", "index.html"));
});
app.listen (config.port, function () {
	console.log (\`server listening on port ${opts.projectPort}\`);
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/src/setupProxy.js`,
			`const proxy = require ("http-proxy-middleware");
const config = require ("./../config");

module.exports = function (app) {
    app.use (proxy ("/api",
        {target: \`http://127.0.0.1:${opts.projectPort}/\`}
    ));
    app.use (proxy ("/public",
        {target: \`http://127.0.0.1:${opts.projectPort}/\`}
    ));
};
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/src/App.js`,
			`import React, {Component} from "react";
import store from "objectum-client";
import {ObjectumApp} from "objectum-react";

class App extends Component {
	constructor (props) {
		super (props);

		store.setUrl ("/api");
		window.store = store;
	}

	render () {
		return (
			<ObjectumApp store={store} name="${opts.createProject}" />
		);
	}
};

export default App;
		`);
		await execAsync (`mkdir -p ${opts.path}/projects/${opts.createProject}/bin`);
		await execAsync (`mkdir -p ${opts.path}/projects/${opts.createProject}/files`);
		await execAsync (`mkdir -p ${opts.path}/projects/${opts.createProject}/schema`);

		writeFile (`${opts.path}/projects/${opts.createProject}/bin/create.js`,
			`let $o = require ("${opts.path}/server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "create"${opts.dbPath ? `,\n\tpath: "${opts.dbPath}"\n` : ""}
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/remove.js`,
			`let $o = require ("${opts.path}/server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "remove"
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/import.js`,
			`let $o = require ("${opts.path}/server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "import",
	file: "schema-objectum.json"
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/bin/export.js`,
			`let $o = require ("${opts.path}/server/objectum");

$o.db.execute ({
	code: "${opts.createProject}",
	fn: "export",
	filterClasses: [],
	file: "../schema/schema-${opts.createProject}.json"
});
		`);
		writeFile (`${opts.path}/projects/${opts.createProject}/start.sh`,
			`rm ${opts.path}/projects/${opts.createProject}/*.log
export NODE_ENV=production
forever start -a -l ${opts.path}/projects/${opts.createProject}/project.log -o /dev/null -e ${opts.path}/projects/${opts.createProject}/project-error.log --sourceDir ${opts.path}/projects/${opts.createProject} index-${opts.projectPort}.js
	`);
		writeFile (`${opts.path}/projects/${opts.createProject}/stop.sh`,
			`forever stop ${opts.path}/projects/${opts.createProject}/index-${opts.projectPort}.js
	`);
		await chmodAsync (`${opts.path}/projects/${opts.createProject}/start.sh`, 0o777);
		await chmodAsync (`${opts.path}/projects/${opts.createProject}/stop.sh`, 0o777);
		await execAsync (`node ${opts.path}/projects/${opts.createProject}/bin/create.js`, `${opts.path}/projects/${opts.createProject}/bin`);
		await execAsync (`node ${opts.path}/projects/${opts.createProject}/bin/import.js`, `${opts.path}/projects/${opts.createProject}/bin`);
	} catch (err) {
		error (err.message);
	}
};

program
.version (require ("./package").version)
.option ("--create-platform", "Create platform")
.option ("--path <path>", "Objectum path")
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
/*
.option ("--create-model <JSON>", "Create model")
.option ("--create-property <JSON>", "Create property")
.option ("--create-query <JSON>", "Create query")
.option ("--create-column <JSON>", "Create column")
*/
.option ("--create-nokod <code>", "Legacy option")
.option ("--siteKey <siteKey>", "Legacy option")
.option ("--secretKey <secretKey>", "Legacy option")
.parse (process.argv);

async function start () {
	if (program ["createPlatform"]) {
		await createPlatform (program);
		process.exit (1);
	} else if (program ["createProject"]) {
		await createProject (program);
		process.exit (1);
	} else if (program ["removeProject"]) {
	
	} else if (program ["createNokod"]) {
		legacy.createNokod (program);
	} else {
		return program.outputHelp ();
	}
};
start ();