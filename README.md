# [@zazuko/query-rdf-data-cube](https://github.com/zazuko/query-rdf-data-cube)

[![npm version](https://img.shields.io/npm/v/@zazuko/query-rdf-data-cube.svg?style=flat)](https://npmjs.org/package/@zazuko/query-rdf-data-cube "View this project on npm")
[![Build Status](https://travis-ci.org/zazuko/query-rdf-data-cube.svg?branch=master)](https://travis-ci.org/zazuko/query-rdf-data-cube)
[![Coverage Status](https://coveralls.io/repos/github/zazuko/query-rdf-data-cube/badge.svg?branch=master)](https://coveralls.io/github/zazuko/query-rdf-data-cube?branch=master)

Query and explore [RDF Data Cubes](https://www.w3.org/TR/vocab-data-cube/) with a JavaScript API,
without writing SPARQL.

## Installation

`npm install @zazuko/query-rdf-data-cube`

## Documentation

See <https://zazuko.github.io/query-rdf-data-cube/>

Changelog: <https://github.com/zazuko/query-rdf-data-cube/blob/master/CHANGELOG.md>

## Examples

See the `examples/` folder at the root of this repository.

## Working Locally

1. `git clone`
1. `npm ci`
1. `npm run build`

#### Running the Tests

* `npm run test`

#### Building and Publishing Documentation

1. `npm run docs:compile`
1. `npm run docs:publish`

#### Running the Examples

* `node examples/introspect-and-query.js`

## Features and Usage

This library has two main use cases: exploring an RDF Data Cube and querying an RDF Data Cube.
Both usually go hand in hand.

Instantiating a Data Cube lets you access its DataSets:
```js
const { DataCubeEntryPoint } = require("query-rdf-data-cube");

// instantiate an RDF Data Cube with a SPARQL endpoint
const entryPoint = new DataCubeEntryPoint("https://ld.stadt-zuerich.ch/query");

// fetch all its datasets
const datasets = await entryPoint.datasets();

// assign the 4th dataset
const dataset = datasets[3];
```

You could also [directly instantiate a DataSet](https://github.com/zazuko/query-rdf-data-cube/blob/ebb4dca18df46fc1f384ed9ee3876b2c865d5d20/src/expressions/filter.test.ts#L13-L21).

A DataSet can retrieve its *Components*, ie. its *Dimensions*, *Measures* and *Attributes*:

```js
const dimensions = await dataset.dimensions();
const measures = await dataset.measures();
const attributes = await dataset.attributes();

const zeitDimension = dimensions[0];
// const raumDimension = dimensions[1];
// Again, dimensions, measures and attributes can also be constructed from scratch:
const raumDimension = new Dimension({
  label: "Raum",
  iri: "https://ld.stadt-zuerich.ch/statistics/property/RAUM"
});
const betriebsartDimension = dimensions[2];
const geschlechtDimension = dimensions[3];

const beschaeftigteMeasure = measures[0];

const quelleAttribute = attributes[0];
const glossarAttribute = attributes[1];
const erwarteteAktualisierungAttribute = attributes[4];
const korrekturAttribute = attributes[5];
```

This setup is quite exhaustive, in many situations you won't want to create all of these or get all of these and rely on this lib to properly guess what to query.

```js
const query = dataset
  .query()
  // .select({}) takes binding names as keys and Component (Dimension/Attribute/Measure) as values
  .select({
    betriebsart: betriebsartDimension,
    geschlecht: geschlechtDimension,
    raum: raumDimension,
    zeit: zeitDimension,

    bep: beschaeftigteMeasure.avg(),

    // include some extra attributes, not all of them
    quelle: quelleAttribute,
    glossar: glossarAttribute,
    erwarteteAktualisierung: erwarteteAktualisierungAttribute,
    korrektur: korrekturAttribute,
  })
  .filter(raumDimension.equals("https://ld.stadt-zuerich.ch/statistics/code/R30000"))
  .groupBy("zeit")
  .having(({ bep }) => bep.gte(10000))
  .limit(3);
```

Now that we built a query, we can generate SPARQL out of it:
```js
const sparql = await query.toSparql();
```

Or execute the SPARQL query against the SPARQL endpoint:
```js
const results = await query.execute();
```
