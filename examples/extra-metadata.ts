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
    {
      languages: ["fr", "de"],
      extraMetadata: [
        { variable: "contact", iri: "https://pcaxis.described.at/contact", multilang: true },
        { variable: "source", iri: "https://pcaxis.described.at/source", multilang: true },
        { variable: "survey", iri: "https://pcaxis.described.at/survey", multilang: true },
        { variable: "database", iri: "https://pcaxis.described.at/database", multilang: true },
        { variable: "unit", iri: "https://pcaxis.described.at/unit", multilang: true },
        { variable: "note", iri: "https://pcaxis.described.at/note", multilang: true },

        { variable: "dateCreated", iri: "http://schema.org/dateCreated", multilang: false },
        { variable: "dateModified", iri: "http://schema.org/dateModified" },
        { variable: "temporalCoverage", iri: "http://schema.org/temporalCoverage", multilang: true },
        { variable: "description", iri: "http://www.w3.org/2000/01/rdf-schema#comment", multilang: true },
      ],
    },
  );
  // find all its dataCubes
  const dataCubes = await entryPoint.dataCubes();

  console.log(prettyPrint(dataCubes));
})();
