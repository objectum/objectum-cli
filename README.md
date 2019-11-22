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
  --create-model <JSON>        Create model
  --create-property <JSON>     Create property
  --create-query <JSON>        Create query
  --create-column <JSON>       Create column
  --import-csv <file>          Import CSV file. Properties in 1st row. Delimiter ";". Require --model.
  --model <model>              Model
  -h, --help                   output usage information
```

## Author

**Dmitriy Samortsev**

+ http://github.com/objectum


## Copyright and license

MIT
