"use strict";

const store = require ("objectum-client");
const {error, exist} = require ("./common");

async function updateOpts (opts) {
	if (!await exist (`${process.cwd ()}/config.json`)) {
		throw new Error (`Configuration of project "config.json" not exists in current directory.`);
	}
	const config = require (`${process.cwd ()}/config.json`);
	
	opts.url = `http://${config.objectum.host}:${config.objectum.port}/projects/${config.code}/`;
	opts.adminPassword = config.adminPassword;
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
		await store.startTransaction ("Creating model");
		
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
		await store.startTransaction ("Creating property");
		
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
		await store.startTransaction ("Creating query");
		
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
		await store.startTransaction ("Creating column");
		
		let o = await store.createColumn (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

module.exports = {
	createModel,
	createProperty,
	createQuery,
	createColumn
};
