"use strict";

const fs = require ("fs");
const {execAsync} = require ("./common");

async function createPlatform (opts) {
	let path = opts ["path"];
	let code = opts ["code"];
	
	await execAsync ("mkdir -p " + path + "/node");
	await execAsync ("git clone ssh://avers@build.objectum.ru:10002/opt/git/objectum.git " + path + "/node");
	await execAsync ("mkdir -p " + path + "/avers-forms");
	await execAsync ("git clone ssh://avers@build.objectum.ru:10002/opt/git/avers-forms.git " + path + "/avers-forms");
	await execAsync ("mkdir -p " + path + "/firewall");
	await execAsync ("git clone ssh://avers@build.objectum.ru:10002/opt/git/firewall.git " + path + "/firewall");
	await execAsync ("mkdir -p " + path + "/projects/" + code);
	await execAsync ("git clone ssh://avers@build.objectum.ru:10002/opt/git/nokod.git " + path + "/projects/" + code);
	await execAsync ("npm install", path + "/node");
	
	let config =
`var storages = {
	${code}: require ("${path}/projects/${code}/config.json"),
};
exports.config = {
	rootDir: "${path}/node",
	projectsDir: "${path}/projects",
	logFile: "server.log",
	mail: {
		enabled: false,
		smtp: {
			host: "",
			maxConnections: 50,
			port: 25,
			forceSender: ""
		}
	},
	startPort: 8100,
	wwwRoot: "${path}/node/node_modules/objectum-ee/www",
	storages,
	redis: {
		enabled: true,
		host: '127.0.0.1',
		port: 6379,
		resetCache: true
	},
	query: {
		maxRowNum: 500000,
		maxCount: 500000,
		strictFilter: true
	},
	log: {
		level: "info"
	},
	admin: {
		ip: "all"
	},
	cluster: {
		www: {
			port: 8100,
			workers: 5
		},
		app: {
			workers: 3
		}
	}
};
	`;
	fs.writeFileSync (path + "/node/config.js", config);
	fs.writeFileSync (path + "/node/index.js",
`var objectum = require ("objectum-ee");
objectum.startMaster (require ("./config"));
	`);
	fs.writeFileSync (path + "/node/objectum.js",
`var objectum = require ("objectum-ee");
var config = require ("./config");
module.exports = new objectum.Objectum (config);
	`);
	fs.writeFileSync (path + "/node/restart.sh",
`cd ${path}/node
./stop.sh
./start.sh
	`);
	fs.writeFileSync (path + "/node/start.sh",
`rm *.log
rm /var/log/objectum*.log
export NODE_ENV=production
forever start -a -l /var/log/objectum.log -o /dev/null -e /var/log/objectum-error.log --sourceDir ${path}/node index.js
	`);
	fs.writeFileSync (path + "/node/stop.sh",
`forever stop index.js
	`);
	await execAsync ("chmod +x " + path + "/node/*.sh");
};

async function createProject (opts) {
	let path = opts ["path"];
	let code = opts ["code"];
	let password = opts ["password"];

	let projectConfig =
`{
	"rootDir": "/opt/objectum/projects/${code}",
	"adminPassword": "${password}",
	"database": "postgres",
	"host": "localhost",
	"port": 5432,
	"db": "${code}",
	"dbUser": "${code}",
	"dbPassword": "1",
	"dbaUser": "postgres",
	"dbaPassword": "12345",
	"autologin": 1,
	"visualObjectum": {
		"serverActions": 1,
		"reportConstructor": 0,
		"projectConstructor": 0,
		"timeMachine": {
			"cardButton": 1,
			"showDates": 0
		},
		"logo": {
			"left": "",
			"right": "",
			"height": 0
		},
		"initAction": ""
	},
	"upload": 1,
	"smtp": {
		"host": "",
		"username": "",
		"password": "",
		"sender": ""
	},
	"scripts": {
		"client": [
			"/opt/objectum/plugins/kladr/client.js"
		]
	},
	"ose": {
		"enabled": 0,
		"admins": "subject.human.vo_adm"
	}
}
	`;
	fs.writeFileSync (path + "/projects/" + code + "/config.json", projectConfig);
	await execAsync ("npm install", path + "/projects/" + code);
	
	let html =
`<html>
<head>
    <title>НОКОД</title>
    <meta http-equiv="Cache-Control" content="no-cache">
    <!-- ExtJS -->
    <link rel="stylesheet" type="text/css" href="/third-party/extjs4/resources/css/ext-all-objectum.css">
    <script type="text/javascript" src="/third-party/extjs4/ext-all-debug.js"></script>
	<script type="text/javascript" src="/third-party/extjs4/locale/ext-lang-ru.js" charset="UTF-8"></script>
    <!-- Objectum Client -->
    <link rel="stylesheet" type="text/css" href="/client/extjs4/css/images.css">
    <script type="text/javascript" src="/client/extjs4/all-debug.js" charset="UTF-8"></script>
    <!-- Current configuration -->
    <script type="text/javascript" src="resources/scripts/all-debug.js" charset="UTF-8"></script>
    <link rel="stylesheet" type="text/css" href="resources/css/images.css">
</head>
<body>
	<div id="loading"></div>
    <script type="text/javascript" charset="UTF-8">
		$mon.init ();
		$mona.init ();
		$o.app.start ({"code":"${code}","name":"НОКОД","version":"4.0","locale":"ru"});
    </script>
</body>
</html>
	`;
	fs.writeFileSync (path + "/projects/" + code + "/index.html", html);
	await execAsync ("mkdir -p " + path + "/projects/" + code + "/db");
	await execAsync ("chown postgres:postgres " + path + "/projects/" + code + "/db");
	await execAsync ("mkdir -p " + path + "/projects/" + code + "/bin");
	fs.writeFileSync (path + "/projects/" + code + "/bin/create.js",
`var $o = require ("${path}/node/objectum");
$o.db.execute ({
	code: "${code}",
	fn: "create",
	path: "${path}/projects/${code}/db"
});
	`);
	fs.writeFileSync (path + "/projects/" + code + "/bin/remove.js",
`var $o = require ("${path}/node/objectum");
$o.db.execute ({
	code: "${code}",
	fn: "remove"
});
	`);
	fs.writeFileSync (path + "/projects/" + code + "/bin/import.js",
`var $o = require ("${path}/node/objectum");
$o.db.execute ({
	code: "${code}",
	fn: "import",
	file: "../schema/schema-nokod_edu.js"
});
	`);
	await execAsync ("node create.js", path + "/projects/" + code + "/bin");
	await execAsync ("node import.js", path + "/projects/" + code + "/bin");
};

async function createForms (opts) {
	let path = opts ["path"];
	let code = opts ["code"];
	let password = opts ["password"];
	
	await execAsync ("npm install", path + "/avers-forms");
	await execAsync ("mkdir -p " + path + "/avers-forms/db");
	await execAsync ("chown postgres:postgres " + path + "/avers-forms/db");
	
	let config =
`{
	"port": 8600,
	"rootDir": "${path}/avers-forms",
	"thirdPartyDir": "${path}/node/node_modules/objectum-ee/www/third-party",
	"workers": 1,
	"maxSockets": 1000,
	"logLevel": "error",
	"sendInterval": 5000,
	"siteKey": "${opts.siteKey}",
	"secretKey": "${opts.secretKey}",
	"ipLimit": 13,
	"respondentHidden": 1,
	"mon": {
		"host": "127.0.0.1",
		"port": 8100,
		"storage": "${code}",
		"adminPassword": "${password}"
	},
    "database": {
	"dir": "${path}/avers-forms/db",
	"host": "localhost",
	"port": 5432,
	"user": "avers_forms",
	"password": "1",
	"dbaUser": "postgres",
	"dbaPassword": "12345"
    }
}
	`;
	fs.writeFileSync (path + "/avers-forms/config.json", config);

	await execAsync ("node avers-forms.js --create", path + "/avers-forms");

	fs.writeFileSync (path + "/avers-forms/restart.sh",
		`cd ${path}/avers-forms
./stop.sh
./start.sh
	`);
	fs.writeFileSync (path + "/avers-forms/start.sh",
		`cd ${path}/avers-forms
rm *.log
rm /var/log/avers-forms*.log
export NODE_ENV=production
forever start -a -l /var/log/avers-forms.log -o /dev/null -e /var/log/avers-forms-error.log --sourceDir ${path}/avers-forms avers-forms.js
	`);
	fs.writeFileSync (path + "/avers-forms/stop.sh",
		`cd ${path}/avers-forms
forever stop avers-forms.js
	`);
	await execAsync ("chmod +x " + path + "/avers-forms/*.sh");
};

async function createFirewall (opts) {
	let path = opts ["path"];
	let code = opts ["code"];
	let password = opts ["password"];

	await execAsync ("npm install", path + "/firewall");
	let config =
		`exports.config = {
	port: 8110,
	backlog: 10000,
	objectum: {
		storage: "${code}",
		adminPassword: "${password}",
		host: "127.0.0.1",
		port: 8100
	},
	workers: 1,
	log: {
		post: {
			url: 0,
			requestData: 0,
			responseData: 0
		},
		get: {
			url: 0
		}
	}
};
	`;
	fs.writeFileSync (path + "/firewall/config.js", config);
	
	fs.writeFileSync (path + "/firewall/restart.sh",
		`cd ${path}/firewall
./stop.sh
./start.sh
	`);
	fs.writeFileSync (path + "/firewall/start.sh",
		`cd ${path}/firewall
rm *.log
rm /var/log/firewall*.log
export NODE_ENV=production
forever start -a -l /var/log/firewall.log -o /dev/null -e /var/log/firewall-error.log --sourceDir ${path}/firewall firewall.js
	`);
	fs.writeFileSync (path + "/firewall/stop.sh",
		`cd ${path}/firewall
forever stop firewall.js
	`);
	await execAsync ("chmod +x " + path + "/firewall/*.sh");
};

async function createBackup (opts) {
	let path = opts ["path"];
	let code = opts ["code"];
	
	await execAsync ("mkdir -p " + path + "/backup");
	fs.writeFileSync (path + "/backup.sh",
`#!/bin/bash

cd ${path}
./stop-all.sh
/etc/init.d/postgresql stop
/etc/init.d/postgresql start
cd ${path}/backup
export PGPASSWORD=1
backupdate=$(date +%Y-%m-%d)
mkdir $backupdate
cd $backupdate

pg_dump -h 127.0.0.1 -Fc -U ${code} ${code} >${code}.dump
pg_dump -h 127.0.0.1 -Fc -U avers_forms avers_forms >avers_forms.dump

cd ${path}
./start-all.sh
	`);
	
	fs.writeFileSync (path + "/restart-all.sh",
		`cd ${path}
./stop-all.sh
./start-all.sh
	`);
	fs.writeFileSync (path + "/start-all.sh",
		`cd ${path}
echo start objectum
cd ${path}/node
./start.sh

echo sleep 20
sleep 20

echo start projects
cd ${path}/avers-forms
./start.sh
cd ${path}/firewall
./start.sh
	`);
	await execAsync ("chmod +x " + path + "/*.sh");
};

async function createNokod (opts) {
	if (!opts.path || !opts.password) {
		console.log ("--path, --password, --site-key, --secret-key required.");
		return;
	}
	opts ["code"] = opts ["createNokod"];
	opts ["password"] = require ("crypto").createHash ("sha1").update (opts.password).digest ("hex").toUpperCase ();
	
	await createPlatform (opts);
	await createForms (opts);
	await createFirewall (opts);
	await createBackup (opts);
	await createProject (opts);
};

module.exports = {
	createNokod
};
