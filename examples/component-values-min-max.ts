// run this example with: $ ts-node examples/component-values.ts
import { inspect } from "util";
import { DataCubeEntryPoint } from "../src/entrypoint";

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}

(async () => {
  const entryPoint = new DataCubeEntryPoint("https://ld.stadt-zuerich.ch/query");
  const dataCubes = await entryPoint.dataCubes();
  const datacube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

  const dimensions = await datacube.dimensions();
  const time = dimensions.find((dimension) => dimension.iri.value.endsWith("/ZEIT"));
  const timeMinMax = await datacube.componentMinMax(time);
  /*
  {
    min: Literal {
      value: '1408-12-31',
      datatype: NamedNode { value: 'http://www.w3.org/2001/XMLSchema#date' },
      language: ''
    },
    max: Literal {
      value: '2017-12-31',
      datatype: NamedNode { value: 'http://www.w3.org/2001/XMLSchema#date' },
      language: ''
    }
  }
  */
  console.log(prettyPrint(timeMinMax));
})();
