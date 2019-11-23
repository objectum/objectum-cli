# Objectum command-line interface (CLI)

## Install:
```bash
npm i -g objectum-cli
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
  --model <model>              Model
  -h, --help                   output usage information
```

## Author

**Dmitriy Samortsev**

+ http://github.com/objectum


## Copyright and license

MIT
