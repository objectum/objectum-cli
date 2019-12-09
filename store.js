"use strict";

const fs = require ("fs");
const store = require ("objectum-client");
const {error, exist} = require ("./common");

async function init (opts) {
	if (!await exist (`${process.cwd ()}/config.json`)) {
		throw new Error (`Configuration of project "config.json" not exists in current directory.`);
	}
	const config = require (`${process.cwd ()}/config.json`);
	
	opts.url = `http://${config.objectum.host}:${config.objectum.port}/projects/${config.code}/`;
	opts.adminPassword = config.adminPassword;
	
	["createModel", "createProperty", "createQuery", "createColumn", "createRecord", "createDictionary", "createTable"].forEach (a => {
		if (opts [a]) {
			opts [a] = opts [a].split ("'").join ('"');
		}
	});
	store.setUrl (opts.url);
	
	opts.sid = await store.auth ({
		"username": "admin",
		"password": opts.adminPassword
	});
};

async function createModel (opts) {
	try {
		await init (opts);
		
		let attrs = JSON.parse (opts.createModel);
		
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
		await init (opts);
		
		let attrs = JSON.parse (opts.createProperty);
		
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
		await init (opts);
		
		let attrs = JSON.parse (opts.createQuery);
		
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
		await init (opts);
		
		let attrs = JSON.parse (opts.createColumn);
		
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
		await init (opts);
		
		let attrs = JSON.parse (opts.createRecord);
		
		await store.startTransaction ("Create record");
		
		let o = await store.createRecord (attrs);
		
		await store.commitTransaction ();
		
		console.log ("result:", o._data);
	} catch (err) {
		error (err.message);
	}
};

async function createDictionary (opts) {
	try {
		await init (opts);
		
		let attrs = JSON.parse (opts.createDictionary);

		if (!attrs.name || !attrs.code) {
			throw new Error ("name or code not exist");
		}
		let d;
		
		await store.startTransaction ("Create dictionary");
		
		if (opts.model) {
			store.getModel (opts.model);
			
			let tokens = opts.model.split (".");
			let prevPath = "d";
			
			for (let i = 0; i < tokens.length; i ++) {
				let code = tokens [i];
				let path = `d.${tokens.slice (0, i + 1).join (".")}`;
				
				if (! store.map ["model"][path]) {
					await store.createModel ({
						name: `${code [0].toUpperCase ()}${code.substr (1)}`, code, parent: prevPath
					});
				}
				prevPath = path;
			}
			d = await store.createModel ({
				name: attrs.name, code: attrs.code, parent: `d.${opts.model}`
			});
		} else {
			d = await store.createModel ({
				name: attrs.name, code: attrs.code, parent: "d"
			});
		}
		await store.createProperty ({
			model: d.getPath (), name: "Name", code: "name", type: "string"
		});
		await store.createProperty ({
			model: d.getPath (), name: "Code", code: "code", type: "string"
		});
		await store.createProperty ({
			model: d.getPath (), name: "Order", code: "order", type: "number"
		});
		await store.commitTransaction ();
		
		console.log ("result:", d._data);
	} catch (err) {
		error (err.message);
	}
};

async function createTable (opts) {
	try {
		if (!opts.model) {
			throw new Error ("--model <model> not exist");
		}
		await init (opts);
		
		let attrs = JSON.parse (opts.createTable);
		
		if (!attrs.name || !attrs.code) {
			throw new Error ("name or code not exist");
		}
		let m = store.getModel (opts.model);
		
		await store.startTransaction ("Create table");
		
		let tokens = opts.model.split (".");
		let prevPath = "t";
		
		for (let i = 0; i < tokens.length; i ++) {
			let code = tokens [i];
			let path = `t.${tokens.slice (0, i + 1).join (".")}`;
			
			if (!store.map ["model"][path]) {
				await store.createModel ({
					name: `${code [0].toUpperCase ()}${code.substr (1)}`, code, parent: prevPath
				});
			}
			prevPath = path;
		}
		let t = await store.createModel ({
			name: attrs.name, code: attrs.code, parent: `t.${opts.model}`
		});
		await store.createProperty ({
			model: t.getPath (), name: m.get ("name"), code: m.get ("code"), type: m.getPath ()
		});
		await store.commitTransaction ();
		
		console.log ("result:", t._data);
	} catch (err) {
		error (err.message);
	}
};

async function importCSV (opts) {
	try {
		if (!opts.model) {
			throw new Error ("--model <model> not exist");
		}
		await init (opts);
		
		await store.startTransaction ("Import CSV");
		
		let data = fs.readFileSync (opts.importCsv, "utf8");
		let rows = data.split ("\n");
		let m = store.getModel (opts.model);
		
		rows = rows.filter (row => {
			return row && row.trim ();
		});
		if (rows.length < 2) {
			throw new Error ("rows count must be > 1");
		}
		let properties = rows [0].split (";");
		let dict = {};
		
		for (let i = 0; i < properties.length; i ++) {
			let code = properties [i];
			let property = m.properties [code];
			
			if (!property) {
				throw new Error (`unknown property: ${code}`);
			}
			if (property.get ("type") >= 1000) {
				let refModel = store.getModel (property.get ("type"));
				
				if (refModel.isDictionary ()) {
					let recs = await store.getDict (refModel.getPath ());
					
					dict [code] = dict [code] || {};
					
					recs.forEach (rec => dict [code][(rec.name || "").toLowerCase ()] = rec.id);
				}
			}
		}
		for (let i = 1; i < rows.length; i ++) {
			let row = rows [i];
			let cols = row.split (";");
			let o = {_model: m.get ("id")};
				
			for (let j = 0; j < properties.length; j ++) {
				let p = properties [j];
				let v = cols [j].trim ();
				
				if (v !== "") {
					if (dict [p]) {
						if (dict [p].hasOwnProperty (v.toLowerCase ())) {
							v = dict [p][v.toLowerCase ()];
						} else {
							throw new Error (`unknown dictionary parameter: ${v}, line: ${i + 1}`);
						}
					}
					o [p] = v;
				}
			}
			let record = await store.createRecord (o);
			
			console.log (i, "of", rows.length - 1, "result:", record._data);
		}
		await store.commitTransaction ();
	} catch (err) {
		await store.rollbackTransaction ();
		error (err.message);
	}
};

module.exports = {
	createModel,
	createProperty,
	createQuery,
	createColumn,
	createRecord,
	createDictionary,
	createTable,
	importCSV
};
