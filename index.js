#!/usr/bin/env node

const program = require ("commander");
const redis = require ("redis");
const pg = require ("pg");
const legacy = require ("./legacy");

function error (s) {
	console.error (s);
	process.exit (1);
};

function checkRedis (opts) {
	return new Promise ((resolve, reject) => {
		let host = opts ["redis-host"] || "127.0.0.1";
		let port = opts ["redis-port"] || 6379;
		let redisClient = redis.createClient (port, host);
		
		redisClient.get ("*", function (err) {
			if (err) {
				reject (`Redis error: ${err} (host: ${host}, port: ${port})`);
			} else {
				resolve ();
			}
		});
	});
};

async function checkPostgresPassword (password) {
};

async function createPlatform (opts) {
	try {
		if (!opts ["path"]) {
			throw new Error ("--path <objectum path> not exist");
		}
		// создать в текущей пустой папке
		
		// проверить существует папка server, projects
		
		await checkRedis ();
	} catch (err) {
		error (err.message);
	}
};

async function createProject (opts) {
	try {
		if (!opts ["path"]) {
			throw new Error ("--path <objectum path> not exist");
		}
		// создать в папке где есть только две папки server, projects
		
		// проверить существует папка project
		
		await checkRedis ();
	} catch (err) {
		error (err.message);
	}
};

program
.version (require ("./package").version)
.option ("--create-platform", "Create platform")
.option ("--path <path>", "Objectum path. Default: current folder")
.option ("--create-project <name>", "Create project")
.option ("--remove-project <name>", "Remove project")
.option ("--create-model <JSON>", "Create model")
.option ("--create-property <JSON>", "Create property")
.option ("--create-query <JSON>", "Create query")
.option ("--create-column <JSON>", "Create column")
.option ("--redis-host <host>", "Redis server host. Default: 127.0.0.1")
.option ("--redis-port <port>", "Redis server port. Default: 6379")
.option ("--db-host <host>", "PostgreSQL server host. Default: 127.0.0.1")
.option ("--db-port <port>", "PostgreSQL server port. Default: 5432")
.option ("--db-dbPassword <port>", "User password of project database. Default: 1")
.option ("--port <port>", "Project port. Default: 3100")
.option ("--create-nokod <code>", "Legacy option")
.option ("--password <password>", "Legacy option")
.option ("--siteKey <siteKey>", "Legacy option")
.option ("--secretKey <secretKey>", "Legacy option")
.parse (process.argv);

if (program ["create-platform"]) {
	if (program ["legacy"]) {
		legacy.createPlatform (program);
	} else {
		createPlatform (program);
	}
} else
if (program ["create-project"]) {
	if (program ["legacy"]) {
		legacy.createProject (program);
	} else {
		createProject (program);
	}
} else
if (program ["remove-project"]) {
	if (program ["legacy"]) {
		error ("not supported");
	}
	if (!program ["path"]) {
		error ("--path <objectum path> not exist");
	}
} else
if (program ["createNokod"]) {
	legacy.createNokod (program);
} else {
	return program.outputHelp ();
}
/*
	objectum-cli -cp -p /opt/objectum
	objectum-cli -cp my_project -p /opt/objectum -db-dbaPassword 12345  -db-host localhost -db-port 5423
	objectum-cli -rp my_project -p /opt/objectum
	objectum-cli -cm {"name": "Item", "code": "code"}
	objectum-cli -cp {"name": "Item", "code": "code"}
	objectum-cli -cq {"name": "Item", "code": "code"}
	objectum-cli -cc {"name": "Item", "code": "code"}
 */
