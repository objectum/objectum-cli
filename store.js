"use strict";

const fs = require ("fs");
const _ = require ("lodash");
const crypto = require ("crypto");
const ProgressBar = require ("progress");
const {error, exist} = require ("./common");
const {Store} = require ("objectum-client");
const store = new Store ();

async function init (opts) {
	if (!await exist (`${process.cwd ()}/config.json`) && !await exist (`${process.cwd ()}/../config.json`)) {
		throw new Error (`Configuration of project "config.json" not exists in current directory (or upper "..").`);
	}
	let config;
	
	try {
		config = require (`${process.cwd ()}/config.json`);
	} catch (err) {
		config = require (`${process.cwd ()}/../config.json`);
	}
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
				name: attrs.name, code: attrs.code, parent: attrs.parent || "d"
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
		let rows = data.split ("\r\n");
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

async function exportCSV (opts) {
	try {
		if (!opts.model) {
			throw new Error ("--model <model> not exist");
		}
		await init (opts);
		
		let m = store.getModel (opts.model);
		let data = await store.getData ({
			model: opts.model,
			offset: 0, limit: 1000000
		});
		let rows = [];
		let row = [];
		let dict = {};
		
		for (let code in m.properties) {
			let property = m.properties [code];
			
			if (property.get ("type") >= 1000) {
				let pm = store.getModel (property.get ("type"));
				
				if (pm.isDictionary ()) {
					dict [code] = true;
					
					let recs = await store.getDict (property.get ("type"));
					
					recs.forEach (rec => dict [rec.id] = rec.name);
				}
			}
			row.push (code);
		}
		rows.push (row.join (";"));
		
		data.recs.forEach (rec => {
			row = [];
			
			for (let code in m.properties) {
				if (dict [code]) {
					row.push (dict [rec [code]] || "");
				} else {
					row.push (rec [code]);
				}
			}
			rows.push (row.join (";"));
		});
		fs.writeFileSync (opts.exportCsv, rows.join ("\r\n"));
		
		console.log ("ok");
	} catch (err) {
		error (err.message);
	}
};

async function importJSON (opts) {
	try {
		await init (opts);

		let data = JSON.parse (fs.readFileSync (opts.importJson));
		let commands = ["createModel", "createProperty", "createQuery", "createColumn", "createRecord"];
		let refMap = {};
		
		await store.startTransaction ("importJSON");
		
		for (let i = 0; i < commands.length; i ++) {
			let cmd = commands [i];
			let recs = data [cmd];
			
			if (recs) {
				let bar = new ProgressBar (`${cmd} - :current/:total, :elapsed sec.: :bar`, {total: recs.length, renderThrottle: 200});
				
				for (let j = 0; j < recs.length; j ++) {
					let rec = recs [j];
					let model = rec._model && store.getModel (rec._model);
					let files = {};
					
					for (let a in rec) {
						let v = rec [a];
						
						if (_.isArray (v)) {
							v = v.join ("\n");
						} else
						if (_.isObject (v)) {
							if (v._ref) {
								if (!refMap [v._ref]) {
									throw new Error (`_ref not exist: ${v._ref}`);
								}
								v = refMap [v._ref];
							} else {
								v = JSON.stringify (v, null, "\t");
							}
						}
						if (cmd == "createRecord") {
							let property = model.properties [a];
							
							if (property) {
/*
								if (property.secure) {
									v = crypto.createHash ("sha1").update (v).digest ("hex").toUpperCase ();
								}
*/
								if (property.type == 5) {
									let tokens = rec [a].split ("/");
									
									files [a] = v;
									v = tokens [tokens.length - 1];
								}
							}
						}
						rec [a] = v;
					}
					let result = await store [cmd] (rec);
					
					if (rec._ref) {
						refMap [rec._ref] = result.id;
					}
					// files
					if (cmd == "createRecord") {
						for (let a in rec) {
							let property = model.properties [a];
							
							if (property && property.type == 5) {
								if (opts.fileDirectory) {
									let buf = fs.readFileSync (`${opts.fileDirectory}/${files [a]}`);
									
									fs.writeFileSync (`public/files/${result.id}-${property.id}-${rec [a]}`, buf);
								} else {
									throw new Error ("--file-directory <directory> not exist");
								}
							}
						}
					}
					bar.tick ();
				}
			}
		}
		await store.commitTransaction ();
		console.log ("ok");
	} catch (err) {
		error (err.message);
	}
};

async function exportJSON (opts) {
	try {
		await init (opts);
		
		let map = {
			model: {},
			property: {},
			query: {},
			column: {}
		};
		let rscAttrs = {
			"model": [
				"parent", "name", "code", "description", "order", "unlogged", "query", "opts"
			],
			"property": [
				"model", "name", "code", "description", "order", "type", "notNull", "secure", "unique", "validFunc", "removeRule", "opts"
			],
			"query": [
				"parent", "name", "code", "description", "order", "query", "layout", "iconCls", "system", "model", "opts"
			],
			"column": [
				"query", "name", "code", "description", "order", "property", "area", "columnWidth", "opts"
			]
		};
		let data = {};
		
		_.each (rscAttrs, (attrs, rsc) => {
			let d = [];
			
			_.sortBy (_.values (store.map [rsc]), "id").forEach (o => {
				if (map [o.id] || (rsc == "model" && o.id < 1000) || o.schema) {
					return;
				}
				let row = {};
				
				attrs.forEach (a => {
					let v = o [a];
					
					if (v) {
						if (a == "parent") {
							v = store.map [rsc][v].getPath ();
						}
						if (a == "model" && rsc == "property") {
							v = store.map ["model"][v].getPath ();
						}
						if (a == "query" && rsc == "column") {
							v = store.map ["query"][v].getPath ();
						}
						if (a == "opts") {
							v = JSON.parse (v);
						}
						if (a == "type" && rsc == "property") {
							let t = store.map ["model"][v];
							
							v = t.getPath ();
						}
						if (a == "query" && rsc == "query") {
							v = v.split ("\n");
						}
						row [a] = v;
					}
				});
				d.push (row);
				map [o.id] = true;
			});
			data ["create" + rsc [0].toUpperCase () + rsc.substr (1)] = d;
		});
		if (opts.records) {
			let allRecs = [], map = {}, fileCount = 1;
			let models = opts.records.split (",");
			
			for (let i = 0; i < models.length; i ++) {
				let model = store.getModel (models [i].trim ());
				let records = await store.getRecords ({model: model.getPath ()});
				let recs = records.map (record => {
					let rec = {
						_model: model.getPath (),
						_ref: "ref-" + record.id
					};
					map [record.id] = rec._ref;
					
					_.each (model.properties, property => {
						let v = record [property.code];
						
						if (property.type >= 1000 && v) {
							if (map [v]) {
								v = {
									_ref: map [v]
								};
							} else {
								throw new Error ("unknown ref: " + v);
							}
						}
						if (property.type == 5 && v) {
							if (opts.fileDirectory) {
								let buf = fs.readFileSync (`${process.cwd ()}/public/files/${record.id}-${property.id}-${v}`);
								
								v = `${fileCount ++}-${v}`;
								fs.writeFileSync (`${opts.fileDirectory}/${v}`, buf);
							} else {
								throw new Error ("--file-directory <directory> not exist");
							}
						}
						rec [property.code] = v;
					});
					return rec;
				});
				allRecs = [...allRecs, ...recs];
			}
			data ["createRecord"] = allRecs;
		}
		fs.writeFileSync (opts.exportJson, JSON.stringify (data, null, "\t"));
		
		console.log ("ok");
	} catch (err) {
		error (err.message, err.stack);
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
	importCSV,
	exportCSV,
	importJSON,
	exportJSON
};
