"use strict";

const fs = require ("fs");
const store = require ("objectum-client");
const {error, exist} = require ("./common");

async function updateOpts (opts) {
	if (!await exist (`${process.cwd ()}/config.json`)) {
		throw new Error (`Configuration of project "config.json" not exists in current directory.`);
	}
	const config = require (`${process.cwd ()}/config.json`);
	
	opts.url = `http://${config.objectum.host}:${config.objectum.port}/projects/${config.code}/`;
	opts.adminPassword = config.adminPassword;
	
	["createModel", "createProperty", "createQuery", "createColumn", "createRecord"].forEach (a => {
		opts [a] = opts [a].split ("'").join ('"');
	});
};

async function createModel (opts) {
	try {
		let attrs = JSON.parse (opts.createModel);
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		await store.startTransaction ("Create model");
		
		let o = await store.createModel (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function createProperty (opts) {
	try {
		let attrs = JSON.parse (opts.createProperty);
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		await store.startTransaction ("Create property");
		
		let o = await store.createProperty (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function createQuery (opts) {
	try {
		let attrs = JSON.parse (opts.createQuery);
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		await store.startTransaction ("Create query");
		
		let o = await store.createQuery (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function createColumn (opts) {
	try {
		let attrs = JSON.parse (opts.createColumn);
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		await store.startTransaction ("Create column");
		
		let o = await store.createColumn (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function createRecord (opts) {
	try {
		let attrs = JSON.parse (opts.createRecord);
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		await store.startTransaction ("Create record");
		
		let o = await store.createRecord (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function importCSV (opts) {
	try {
		let data = fs.readFileSync (opts.importCsv, "utf8");
		let rows = data.split ("\n");
		
		await updateOpts (opts);
		
		store.setUrl (opts.url);
		
		opts.sid = await store.auth ({
			"username": "admin",
			"password": opts.adminPassword
		});
		let m = store.getModel (opts.model);
		
		await store.startTransaction ("Import CSV");
		
		let properties = [];
		
		rows = rows.filter (row => {
			return row && row.trim ();
		});
		for (let i = 0; i < rows.length; i ++) {
			let row = rows [i];
			let cols = row.split (";");
			
			if (!i) {
				properties = cols;
			} else {
				let o = {_model: m.get ("id")};
				
				for (let j = 0; j < properties.length; j ++) {
					let p = properties [j];
					
					o [p] = cols [j];
				}
				let record = await store.createRecord (o);
				
				console.log (i, "of", rows.length - 1, "result:", record._data);
			}
		}
		await store.commitTransaction ();
	} catch (err) {
		error (err.message);
	}
};

module.exports = {
	createModel,
	createProperty,
	createQuery,
	createColumn,
	createRecord,
	importCSV
};
