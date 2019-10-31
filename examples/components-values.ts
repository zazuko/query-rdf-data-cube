// run this example with: $ ts-node examples/components-values.ts
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
    { languages: ["de"] },
  );
  const dataCubes = await entryPoint.dataCubes();
  const dataCube = dataCubes[0];

  const dimensions = await dataCube.dimensions();

  const values = await dataCube.componentsValues(dimensions);
  console.log(prettyPrint(dimensions.map((dim) => [dim.labels[0].value, values.get(dim)])));

  const minMaxes = await dataCube.componentsMinMax(dimensions);
  console.log(prettyPrint(dimensions.map((dim) => [dim.labels[0].value, minMaxes.get(dim)])));
})();
