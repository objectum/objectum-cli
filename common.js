"use strict";

const promisify = require ("util").promisify;
const fs = require ("fs");
const accessAsync = promisify (fs.access);
const mkdirAsyncInternal = promisify (fs.mkdir);

function execAsync (cmd, cwd) {
	return new Promise ((resolve, reject) => {
		console.log ("cmd:", cmd, cwd ? (`cwd: ${cwd}`) : "");
		
		const {spawn} = require ("child_process");
		const tokens = cmd.split (" ");
		
		cmd = tokens [0];
		
		if (cmd == "npm" && /^win/.test (process.platform)) {
			cmd = "npm.cmd";
		}
		const worker = spawn (cmd, tokens.slice (1, tokens.length), {cwd});
		
		worker.stdout.on ("data", (data) => {
			if (Buffer.isBuffer (data)) {
				data = data.toString ("utf8");
			}
			console.log (data);
		});
		worker.stderr.on ("data", (data) => {
			if (Buffer.isBuffer (data)) {
				data = data.toString ("utf8");
			}
			console.error (data);
		});
		worker.on ("close", (code) => {
			console.log (`exited with code: ${code}`);
			resolve ();
		});
	});
};

async function exist (path) {
	try {
		await accessAsync (path, fs.constants.F_OK);
		return true;
	} catch (err) {
		return false;
	}
};

function writeFile (file, data) {
	console.log ("writeFile:", file, "data:\n", data);
	fs.writeFileSync (file, data);
};

async function mkdirAsync (path) {
	console.log ("mkdir:", path);
	await mkdirAsyncInternal (path, {recirsive: true});
};

module.exports = {
	execAsync,
	exist,
	writeFile,
	mkdirAsync
};
