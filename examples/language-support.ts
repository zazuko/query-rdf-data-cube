// run this example with: $ ts-node examples/language-support.ts
import { inspect } from "util";
import { DataCubeEntryPoint } from "../src/entrypoint";

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}
function printTitle(str) {
  return `\n\n---- ${str} ----\n`;
}

(async () => {
  // instantiate an RDF Data Cube
  const entryPoint = new DataCubeEntryPoint(
    "https://trifid-lindas.test.cluster.ldbar.ch/query",
    { languages: ["fr", "de"] },
  );
  // find all its dataCubes
  const dataCubes = await entryPoint.dataCubes();
  // we'll work with one of them
  const dataCube = dataCubes[0];

  const dimensions = await dataCube.dimensions();
  const measures = await dataCube.measures();
  const attributes = await dataCube.attributes();

  const variable = dimensions[0];
  const size = dimensions[1];
  const canton = dimensions[2];

  // show all dimensions, measures and attributes
  console.log(printTitle("COMPONENTS"));
  console.log(printTitle("dimensions"));
  console.log(prettyPrint(dimensions));
  console.log(printTitle("measures"));
  console.log(prettyPrint(measures));

  const query = dataCube
    .query()
    // select has binding names as keys and Component (Dimension/Attribute/Measure) as values.
    .select({
      mes: measures[0],
      variable,
      size,
      canton,
    })
    .limit(2);

  const sparql = await query.toSparql();
  console.log(printTitle("SPARQL"));
  console.log(sparql);

  const results = await query.execute();

  console.log(printTitle("RESULTS"));
  console.log(prettyPrint(results));
})();
