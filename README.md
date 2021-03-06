# Objectum command-line interface (CLI)

Objectum ecosystem:
* Javascript platform https://github.com/objectum/objectum  
* Isomorhic javascript client https://github.com/objectum/objectum-client  
* Proxy for server methods and access control https://github.com/objectum/objectum-proxy  
* React components https://github.com/objectum/objectum-react  
* Command-line interface (CLI) https://github.com/objectum/objectum-cli  
* Objectum project example https://github.com/objectum/catalog 

## Install:
```bash
npm install -g objectum-cli
```

## Options:
```bash
> objectum-cli

Usage: objectum-cli [options]

Options:
  -V, --version                output the version number
  --path <path>                Objectum path
  --create-platform            Create platform
  --create-project <name>      Create project
  --redis-host <host>          Redis server host. Default: 127.0.0.1
  --redis-port <port>          Redis server port. Default: 6379
  --objectum-port <port>       Objectum port. Default: 8200
  --project-port <port>        Project port. Default: 3100
  --db-host <host>             PostgreSQL server host. Default: 127.0.0.1
  --db-port <port>             PostgreSQL server port. Default: 5432
  --db-dbPassword <password>   User password of project database. Default: 1
  --db-dbaPassword <password>  postgres password. Default: 12345
  --db-path <path>             Optional tablespace directory
  --password <password>        Project 'admin' password. Default: admin
  --create-model <JSON>        Create model. Example: objectum-cli --create-model "{'name': 'Item', 'code': 'item'}"
  --create-property <JSON>     Create property. Example: objectum-cli --create-property "{'model': 'item', 'name': 'Name', 'code': 'name'}"
  --create-query <JSON>        Create query. Example: objectum-cli --create-query "{'name': 'Items', 'code': 'item'}"
  --create-column <JSON>       Create column. Example: objectum-cli --create-column "{'query': 'item', 'name': 'Name', 'code': 'name'}
  --create-record <JSON>       Create record. Example: objectum-cli --create-record "{'_model': 'item', 'name': 'Item 1'}"
  --create-dictionary <JSON>   Create dictionary in model. Example: objectum-cli --create-dictionary "{'name': 'Type', 'code': 'type'}" --model item
  --create-table <JSON>        Create table (tabular part) in model. Example: objectum-cli --create-table "{'name': 'Comment', 'code': 'comment'}" --model item  --import-csv <file>          Import CSV file. Properties in 1st row. Delimiter ";". Require --model.
  --import-csv <file>          Import CSV file. Properties in 1st row. Delimiter ";". Require --model.
  --export-csv <file>          Export CSV file. Properties in 1st row. Delimiter ";". Require --model.
  --model <model>              Model
  --file <file>                Execute JSON (createModel: [...], createProperty: [...], createQuery: [], createRecord: [])
  -h, --help                   output usage information
```

## Platform installation

```bash
mkdir /opt/objectum
objectum-cli --path /opt/objectum --create-platform
```

## Project installation
Installs platform if not exist and project.
```bash
mkdir /opt/objectum
objectum-cli --path /opt/objectum --create-project my_project
```

## Create model
```bash
cd /opt/objectum/projects/my_project
objectum-cli --create-model "{'name': 'Item', 'code': 'item'}"
```

## JSON example
objectum-cli --file my-cli.json  
my-cli.json:
```json
{
	"createModel": [
		{
			"name": "Item", 
			"code": "item"
		}
	],
	"createProperty": [
		{
			"model": "item", 
			"name": "Date", 
			"code": "date",
			"type": "date"
		},
		{
			"model": "item", 
			"name": "Name", 
			"code": "name",
			"type": "string"
		},
		{
			"model": "item", 
			"name": "Cost", 
			"code": "cost",
			"type": "number"
		},
		{
			"model": "item", 
			"name": "Type", 
			"code": "type",
			"type": "d.item.type"
		},
		{
			"model": "item", 
			"name": "Photo", 
			"code": "photo",
			"type": "file",
			"opts": {
				"image": {
					"width": 400,
					"height": 300,
					"aspect": 1.5
				}
			}
		}
	],
	"createQuery": [
		{
			"name": "Item",
			"code": "item"
		},
		{
			"name": "List",
			"code": "list",
			"parent": "item",
			"query": [
				"{\"data\": \"begin\"}",
				"select",
				"    {\"prop\": \"a.id\", \"as\": \"id\"},",
				"    {\"prop\": \"a.name\", \"as\": \"name\"},",
				"    {\"prop\": \"a.cost\", \"as\": \"cost\"},",
				"    {\"prop\": \"a.date\", \"as\": \"date\"},",
				"    {\"prop\": \"a.photo\", \"as\": \"photo\"},",
				"    {\"prop\": \"a.type\", \"as\": \"type\"}",
				"{\"data\": \"end\"}",
				"",
				"{\"count\": \"begin\"}",
				"select",
				"    count (*) as num",
				"{\"count\": \"end\"}",
				"",
				"from",
				"    {\"model\": \"item\", \"alias\": \"a\"}",
				"",
				"{\"where\": \"empty\"}",
				"",
				"{\"order\": \"empty\"}",
				"",
				"limit {\"param\": \"limit\"}",
				"offset {\"param\": \"offset\"}"
			]
		}
	],
	"createRecord": [
		{
			"_model": "d.item.type",
			"name": "Videocard",
			"_ref": "videocardType"
		},
		{
			"_model": "item",
			"name": "RTX 2080",
			"date": "2020-06-03T19:27:38.292Z",
			"type": {
				"_ref": "videocardType"
			},
			"cost": "800",
			"photo": "images/rtx2080.png"
		}
	]
}
```
"query": [] - array is multi-line text  
"photo": "images/rtx2080.png" - local file
  
## Author

**Dmitriy Samortsev**

+ http://github.com/objectum


## Copyright and license

MIT
