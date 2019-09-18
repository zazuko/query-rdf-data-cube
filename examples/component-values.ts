// run this example with: $ ts-node examples/component-values.ts
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
  const datacube = dataCubes[0];

  const dimensions = await datacube.dimensions();

  const sizeClasses = dimensions[1];
  console.log(prettyPrint(sizeClasses));

  const values = await datacube.componentValues(sizeClasses);
  console.log(prettyPrint(values));
  /*
  [
    {
      label: Literal {
        value: 'Grössenklasse - Total',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/0' }
    },
    {
      label: Literal {
        value: '< 50 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/1' }
    },
    {
      label: Literal {
        value: '50 - 100 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/2' }
    },
    {
      label: Literal {
        value: '101 - 200 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/3' }
    },
    {
      label: Literal {
        value: '201 - 500 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/4' }
    },
    {
      label: Literal {
        value: '501 - 1000 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/5' }
    },
    {
      label: Literal {
        value: '1001 - 5000 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/6' }
    },
    {
      label: Literal {
        value: '> 5000 ha',
        datatype: NamedNode { value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString' },
        language: 'de'
      },
      value: NamedNode { value: 'http://example.org/anzahl-forstbetriebe/property/1/7' }
    }
  ]
  */
  console.log(prettyPrint(values
    .map(((row) => `"${row.label.value}"${row.label.language ? `@${row.label.language}` : ""}`))));
  /*
  [
    '"Grössenklasse - Total"@de',
    '"< 50 ha"@de',
    '"50 - 100 ha"@de',
    '"101 - 200 ha"@de',
    '"201 - 500 ha"@de',
    '"501 - 1000 ha"@de',
    '"1001 - 5000 ha"@de',
    '"> 5000 ha"@de'
  ]
  */
})();
