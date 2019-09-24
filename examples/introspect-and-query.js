const { inspect } = require("util");
const { DataCubeEntryPoint, Dimension } = require("..");

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}
function printTitle(str) {
  return `\n\n---- ${str} ----\n`;
}

(async () => {
  // instantiate an RDF Data Cube
  const entryPoint = new DataCubeEntryPoint("https://ld.stadt-zuerich.ch/query");
  // find all its dataCubes
  const dataCubes = await entryPoint.dataCubes();
  // we'll work with one of them
  const datacube = dataCubes[3];

  const dimensions = await datacube.dimensions();
  const measures = await datacube.measures();
  const attributes = await datacube.attributes();

  // show all dimensions, measures and attributes
  console.log(printTitle("COMPONENTS"));
  console.log(printTitle("dimensions"));
  console.log(prettyPrint(dimensions));
  console.log(printTitle("measures"));
  console.log(prettyPrint(measures));

  const zeitDimension = dimensions[0];
  // const raumDimension = dimensions[1];
  // dimensions, measures and attributes can also be constructed from scratch:
  const raumDimension = new Dimension({
    labels: [{ value: "Raum", language: "de" }],
    iri: "https://ld.stadt-zuerich.ch/statistics/property/RAUM"
  });
  const betriebsartDimension = dimensions[2];

  const beschaeftigteMeasure = measures[0];

  const quelleAttribute = attributes[0];
  const glossarAttribute = attributes[1];
  const erwarteteAktualisierungAttribute = attributes[4];
  const korrekturAttribute = attributes[5];

  const query = datacube
    .query()
    // select has binding names as keys and Component (Dimension/Attribute/Measure) as values.
    .select({
      betriebsart: betriebsartDimension,
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
    .orderBy(beschaeftigteMeasure.desc(), zeitDimension)
    .limit(3);

  const sparql = await query.toSparql();

  const results = await query.execute();

  console.log(printTitle("SPARQL"));
  console.log(sparql);
  console.log(printTitle("RESULTS"));
  console.log(prettyPrint(results));
})();
