// tslint:disable: max-line-length
import { DataCubeEntryPoint, EntryPointOptions } from "../src/entrypoint";
import { fetch } from "./utils/fetch-mock";

const newCube = (endpoint: string, languages?: string[]) => {
  const options: EntryPointOptions = {
    fetcher: {
      fetch
    }
  };
  if (languages) {
    options.languages = languages;
  }
  return new DataCubeEntryPoint(endpoint, options);
};

describe("DataCubeEntryPoint", () => {
  it("handles responses that are not JSON", () => {
    const cube = newCube("http://example.com");
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[FetchError: invalid json response body at http://example.com/?query=PREFIX%20rdfs%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0APREFIX%20rdf%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0APREFIX%20xsd%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0APREFIX%20qb%3A%20%3Chttp%3A%2F%2Fpurl.org%2Flinked-data%2Fcube%23%3E%0APREFIX%20dc11%3A%20%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F%3E%0APREFIX%20dcterms%3A%20%3Chttp%3A%2F%2Fpurl.org%2Fdc%2Fterms%2F%3E%0APREFIX%20skos%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2004%2F02%2Fskos%2Fcore%23%3E%0ASELECT%20%3Firi%20%3FgraphIri%20%3Flabel%20WHERE%20%7B%0A%20%20GRAPH%20%3FgraphIri%20%7B%20%3Firi%20rdf%3Atype%20qb%3ADataSet.%20%7D%0A%20%20BIND(COALESCE(%22%22%5E%5Exsd%3Astring)%20AS%20%3Flabel)%0A%7D reason: Unexpected token < in JSON at position 0]`
    );
  });
  it("reports parsing errors", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#error-message"
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: error on this endpoint]`
    );
  });
  it("reports bad data", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#bad-data"
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: Endpoint returned bad binding: {"type":"a bad type","value":"http://example.org/anzahl-forstbetriebe/dataset"}]`
    );
  });
  it("handles bnodes", async () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#handles-bnodes"
    );
    const dataCubes = await cube.dataCubes();
    expect(dataCubes[0].iri).toBe("someBlankNode");
  });
  it("handles bad HTTP status", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#bad-HTTP-status",
      ["ru", "hu"]
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: HTTP500 Some Server Error]`
    );
  });
});

describe(".dataCubeByIri()", () => {
  it("takes an IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    for (const dataCube of dataCubes) {
      const iri = dataCube.iri;
      expect(await cube.dataCubeByIri(iri)).toMatchObject(dataCube);
    }
  });
  it("caches the dataCubes", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const dataCube of dataCubes.slice(0, 2)) {
      const dataCubeIri = dataCube.iri;
      const dataCubeFound = await cube2.dataCubeByIri(dataCubeIri);
      expect(dataCubeFound.toJSON()).toBe(dataCube.toJSON());
    }
  });
});

describe(".dataCubesByGraphIri()", () => {
  it("takes a graph IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const dataCube of dataCubes.slice(0, 3)) {
      const graphIri = dataCube.graphIri;
      const expecting = (await cube2.dataCubesByGraphIri(graphIri)).map(ds =>
        ds.toJSON()
      );
      const expected = dataCubes
        .filter(ds => ds.graphIri === graphIri)
        .map(ds => ds.toJSON());
      expect(expecting).toMatchObject(expected);
    }
  });
  it("caches the graphs", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const graphs = await cube.graphs();
    for (const graphIri of graphs.slice(0, 2)) {
      const dataCubes = await cube.dataCubesByGraphIri(graphIri.value);
      const dataCube = dataCubes[0];
      expect(dataCube.graphIri).toBe(graphIri.value);
    }
  });
});
