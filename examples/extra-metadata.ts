// run this example with: $ ts-node examples/extra-metadata.ts
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
    {
      languages: ["de", ""],
      extraMetadata: [
        { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
        { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
        { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
        { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
        { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
        { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

        { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
        { variable: "dateModified", iri: "http://schema.org/dateModified" },
        { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
      ],
    },
  );
  // find all its dataCubes
  const dataCubes = await entryPoint.dataCubes();

  dataCubes.forEach((dataCube) => {
    const extraMetadata = [...dataCube.extraMetadata.entries()].map(([key, value]) => {
      const obj: any = { key };
      if (!value) {
        return obj;
      }
      obj.value = value.value;
      if (value.datatype) {
        obj.datatype = value.datatype.value;
      }
      if (value.language) {
        obj.language = value.language;
      }
      return obj;
    });
    console.log("");
    console.log(dataCube.iri, extraMetadata);
  });

  const cube = dataCubes[0];
  const dimensions = await cube.dimensions();
  for (const dimension of dimensions) {
    console.log(`dimension: ${dimension.labels[0].value} ` +
      `has scale of measure ${dimension.extraMetadata.scaleOfMeasure.value}`);
  }
})();
