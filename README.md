# [@zazuko/query-rdf-data-cube](https://github.com/zazuko/query-rdf-data-cube)

[![npm version](https://img.shields.io/npm/v/@zazuko/query-rdf-data-cube.svg?style=flat)](https://npmjs.org/package/@zazuko/query-rdf-data-cube "View this project on npm")
[![Build Status](https://travis-ci.org/zazuko/query-rdf-data-cube.svg?branch=master)](https://travis-ci.org/zazuko/query-rdf-data-cube)
[![Coverage Status](https://coveralls.io/repos/github/zazuko/query-rdf-data-cube/badge.svg?branch=master)](https://coveralls.io/github/zazuko/query-rdf-data-cube?branch=master)

Query and explore [RDF Data Cubes](https://www.w3.org/TR/vocab-data-cube/) with a JavaScript API,
without writing SPARQL.

- [Installation](#installation)
- [Concepts](#concepts)
- [API Documentation](#api-documentation)
- [Examples](#examples)
- [Working Locally](#working-locally)
- [Features and Usage](#features-and-usage)

## Installation

- `npm install @zazuko/query-rdf-data-cube`
- [CHANGELOG](https://github.com/zazuko/query-rdf-data-cube/blob/master/CHANGELOG.md)

## Concepts

RDF Data Cubes are an implementation of the generic [OLAP](https://en.wikipedia.org/wiki/Online_analytical_processing) concept and more specifically, [OLAP cube](https://en.wikipedia.org/wiki/OLAP_cube).
What RDF Data Cube calls _data structure definition_ can be mapped to _dimension tables_ in [OLAP cubes](https://en.wikipedia.org/wiki/OLAP_cube#Terminology), the _observations_ in RDF Data Cube are called _fact tables_. 

The main classes this library exposes are the following:

- [`DataCubeEntryPoint`](https://zazuko.github.io/query-rdf-data-cube/classes/datacubeentrypoint.html)  
    The *EntryPoint* has a SPARQL endpoint.
    It lets you discover and fetch Data Cubes available at this endpoint and their corresponding Dimensions, Attributes, and Measures.
- [`DataCube`](https://zazuko.github.io/query-rdf-data-cube/classes/datacube.html)  
    A Data Cube represents the [*cube model*](https://www.w3.org/TR/vocab-data-cube/#cubes-model). It has Dimensions, Attributes and Measures and is initialized with an IRI and a graph IRI.  
    Querying a DataCube starts with having a DataCube instance.
- [`Component`](https://zazuko.github.io/query-rdf-data-cube/classes/component.html)  
    An abstract class, parent of the following [*component properties*](https://www.w3.org/TR/vocab-data-cube/#dsd-dimensions):
    - [`Dimension`](https://zazuko.github.io/query-rdf-data-cube/classes/dimension.html)
    - [`Attribute`](https://zazuko.github.io/query-rdf-data-cube/classes/attribute.html)
    - [`Measure`](https://zazuko.github.io/query-rdf-data-cube/classes/measure.html)
    
    [Filter operators](https://zazuko.github.io/query-rdf-data-cube/classes/baseexpr.html#bound) can be applied directly to components.


## API Documentation

See <https://zazuko.github.io/query-rdf-data-cube/>

## Examples

See the [`examples/`](https://github.com/zazuko/query-rdf-data-cube/tree/master/examples) folder at the root of this repository.

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

Instantiating a DataCube EntryPoint lets you access its DataCubes:
```js
const { DataCubeEntryPoint } = require("query-rdf-data-cube");

// instantiate an RDF Data Cube with a SPARQL endpoint
const entryPoint = new DataCubeEntryPoint("https://ld.stadt-zuerich.ch/query");

// fetch all its dataCubes
const dataCubes = await entryPoint.dataCubes();

// assign the 4th datacube
const datacube = dataCubes[3];
```

You could also [directly instantiate a DataCube](https://github.com/zazuko/query-rdf-data-cube/blob/ebb4dca18df46fc1f384ed9ee3876b2c865d5d20/src/expressions/filter.test.ts#L13-L21).

A DataCube can retrieve its *Components*, ie. its *Dimensions*, *Measures* and *Attributes*:

```js
const dimensions = await datacube.dimensions();
const measures = await datacube.measures();
const attributes = await datacube.attributes();

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
const query = datacube
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
