// run this example with: $ ts-node examples/component-values.ts
import { inspect } from "util";
import { Dimension } from "../src/components";
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
    "https://ld.stadt-zuerich.ch/query",
  );
  const dataCubes = await entryPoint.dataCubes();
  const dataCube = dataCubes
    .find((cube) => cube.iri === "https://ld.stadt-zuerich.ch/statistics/dataset/BEW-RAUM-ZEIT");

  const zeitDimension = new Dimension({
    label: { value: "Zeit", language: "de" },
    iri: "https://ld.stadt-zuerich.ch/statistics/property/ZEIT",
  });

  const query = dataCube
    .query()
    .select({
      zeit: zeitDimension,
    })
    .filter(({ zeit }) => zeit.gte("2000-01-01"))
    .filter(({ zeit }) => zeit.lte("2010-12-31"));

  console.log(await query.componentValues());
})();
