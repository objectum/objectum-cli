"use strict";

const promisify = require ("util").promisify;
const fs = require ("fs");
const accessAsync = promisify (fs.access);

function execAsync (cmd, cwd) {
	return new Promise ((resolve, reject) => {
		console.log ("cmd:", cmd, cwd ? (`cwd: ${cwd}`) : "");
		
		const {spawn} = require ("child_process");
		const tokens = cmd.split (" ");
		const worker = spawn (tokens [0], tokens.slice (1, tokens.length), {cwd});
		
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

module.exports = {
	execAsync,
	exist,
	writeFile
};
