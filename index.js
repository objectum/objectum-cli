#!/usr/bin/env node

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
		console.log (await client.queryAsync ("select version ()"));
		
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
		
		writeFile (`${opts.path}/server/config.json`,
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
		writeFile (`${opts.path}/server/index--${opts.objectumPort}.js`, `require ("objectum").start (require ("./config"));`);
		writeFile (`${opts.path}/server/objectum.js`,
		`let Objectum = require ("objectum").Objectum;

module.exports = new Objectum (require ("./config"));
		`);
		writeFile (`${opts.path}/server/start.sh`,
			`cd ${opts.path}/server
rm *.log
export NODE_ENV=production
forever start -a -l ${opts.path}/server/objectum.log -o /dev/null -e ${opts.path}/server/objectum-error.log --sourceDir ${opts.path}/server index-${opts.objectumPort}.js
	`);
		writeFile (`${opts.path}/server/stop.sh`,
			`cd ${opts.path}/server
forever stop index-${opts.objectumPort}.js
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
		opts.projectPort = opts.projectPort || 3100;
		opts.dbHost = opts.dbHost || "127.0.0.1";
		opts.dbPort = opts.dbPort || 5432;
		opts.dbDbPassword = opts.dbDbPassword || "1";
		opts.dbDbaPassword = opts.dbDbaPassword || "12345";
	
		await checkPostgresPassword (opts);
		await execAsync (`mkdir -p ${opts.path}/projects/${opts.createProject}`);
		
	
		
	} catch (err) {
		error (err.message);
	}
};

program
.version (require ("./package").version)
.option ("--create-platform", "Create platform")
.option ("--path <path>", "Objectum path")
.option ("--create-project <name>", "Create project")
.option ("--remove-project <name>", "Remove project")
.option ("--create-model <JSON>", "Create model")
.option ("--create-property <JSON>", "Create property")
.option ("--create-query <JSON>", "Create query")
.option ("--create-column <JSON>", "Create column")
.option ("--redis-host <host>", "Redis server host. Default: 127.0.0.1")
.option ("--redis-port <port>", "Redis server port. Default: 6379")
.option ("--objectum-port <port>", "Objectum port. Default: 8200")
.option ("--project-port <port>", "Project port. Default: 3100")
.option ("--db-host <host>", "PostgreSQL server host. Default: 127.0.0.1")
.option ("--db-port <port>", "PostgreSQL server port. Default: 5432")
.option ("--db-dbPassword <password>", "User password of project database. Default: 1")
.option ("--db-dbaPassword <password>", "postgres password. Default: 12345")
.option ("--create-nokod <code>", "Legacy option")
.option ("--password <password>", "Legacy option")
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

/*
	npm i -g objectum-cli forever

	objectum-cli -cp -p /opt/objectum
	objectum-cli -cp my_project -p /opt/objectum -db-dbaPassword 12345  -db-host localhost -db-port 5423
	objectum-cli -rp my_project -p /opt/objectum
	objectum-cli -cm {"name": "Item", "code": "code"}
	objectum-cli -cp {"name": "Item", "code": "code"}
	objectum-cli -cq {"name": "Item", "code": "code"}
	objectum-cli -cc {"name": "Item", "code": "code"}
 */
