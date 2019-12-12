// run this example with: $(npm bin)/ts-node examples/component-broader.ts
import { inspect } from "util";
import { DataCubeEntryPoint } from "../src/entrypoint";

function prettyPrint(obj) {
  return inspect(obj, false, 10000, true);
}

(async () => {
  const entryPoint = new DataCubeEntryPoint("https://ld.stadt-zuerich.ch/query", {
    languages: [""],
  });
  const dataCubes = await entryPoint.dataCubes();
  const dataCube = dataCubes.find((cube) => cube.iri.endsWith("BEW-RAUM-ZEIT"));

  const dimensions = await dataCube.dimensions();
  const zeit = dimensions.find((dimension) => dimension.iri.value.endsWith("/ZEIT"));
  const raum = dimensions.find((dimension) => dimension.iri.value.endsWith("/RAUM"));

  const raumIn = raum.broader();
  const quartier = raumIn.broader();
  const kreis = quartier.broader();
  const gemeinde = kreis.broader();
  const kanton = gemeinde.broader();
  const land = kanton.broader();
  const query = dataCube
    .query()
    .select({
      zeit,
      raum,
      raumIn,
      quartier,
      kreis,
      gemeinde,
      kanton,
      land,
    })
    .limit(1);
  const sparql = await query.toSparql();

  console.log(sparql);

  const results = await query.execute();

  console.log(prettyPrint(results));

})();
