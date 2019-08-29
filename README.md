# query-rdf-data-cube

Explore or query [RDF Data Cubes](https://www.w3.org/TR/vocab-data-cube/) with a JavaScript API,
without writing SPARQL.

## Installation

`npm install query-rdf-data-cube`

## Documentation

See <https://zazuko.github.io/query-rdf-data-cube/>

## Examples

See the `examples/` folder at the root of this repository.

## Features and Usage

This library has two main use cases: exploring an RDF Data Cube and querying an RDF Data Cube.
Both usually go hand in hand.

Instantiating a Data Cube lets you access its DataSets:
```js
const { DataCube } = require("query-rdf-data-cube");

// instantiate an RDF Data Cube with a SPARQL endpoint
const datacube = new DataCube("https://ld.stadt-zuerich.ch/query");

// fetch all its datasets
const datasets = await datacube.datasets();

// assign the 4th dataset
const dataset = datasets[3];
```

You could also [directly instantiate a DataSet](https://github.com/zazuko/query-rdf-data-cube/blob/ebb4dca18df46fc1f384ed9ee3876b2c865d5d20/src/expressions/filter.test.ts#L13-L21).

A DataSet can retrieve its *Components*, ie. its *Dimensions*, *Measures* and *Attributes*:

```javascript
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

```javascript
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
```javascript
const sparql = await query.toSparql();
```

Or execute the SPARQL query against the SPARQL endpoint:
```javascript
const results = await query.execute();
```
