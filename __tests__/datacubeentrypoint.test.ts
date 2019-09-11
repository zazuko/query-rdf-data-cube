// tslint:disable: max-line-length
import { DataCubeEntryPoint, EntryPointOptions } from "../src/entrypoint";
import { fetch } from "./utils/fetch-mock";

const newCube = (endpoint: string, languages?: string[]) => {
  const options: EntryPointOptions = {
    fetcher: {
      fetch,
    },
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
      `[FetchError: invalid json response body at http://example.com/ reason: Unexpected token < in JSON at position 0]`,
    );
  });
  it("reports parsing errors", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#error-message",
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: error on this endpoint]`,
    );
  });
  it("reports bad data", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#bad-data",
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: Endpoint returned bad binding: {"type":"a bad type","value":"http://example.org/anzahl-forstbetriebe/dataset"}]`,
    );
  });
  it("handles bnodes", async () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#handles-bnodes",
    );
    const dataCubes = await cube.dataCubes();
    expect(dataCubes[0].iri).toBe("someBlankNode");
  });
  it("handles bad HTTP status", () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#bad-HTTP-status",
      ["ru", "hu"],
    );
    expect(cube.dataCubes()).rejects.toMatchInlineSnapshot(
      `[Error: HTTP500 Some Server Error]`,
    );
  });
});

describe(".dataCubeByIri()", () => {
  it("takes an IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    for (const datacube of dataCubes) {
      const iri = datacube.iri;
      expect(await cube.dataCubeByIri(iri)).toMatchObject(datacube);
    }
  });
  it("caches the dataCubes", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const datacube of dataCubes.slice(0, 2)) {
      const dataCubeIri = datacube.iri;
      const datacubeFound = await cube2.dataCubeByIri(dataCubeIri);
      expect(datacubeFound.toJSON()).toBe(datacube.toJSON());
    }
  });
});

describe(".dataCubesByGraphIri()", () => {
  it("takes a graph IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const dataCubes = await cube.dataCubes();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const datacube of dataCubes.slice(0, 3)) {
      const graphIri = datacube.graphIri;
      const expecting = (await cube2.dataCubesByGraphIri(graphIri)).map((ds) =>
        ds.toJSON(),
      );
      const expected = dataCubes
        .filter((ds) => ds.graphIri === graphIri)
        .map((ds) => ds.toJSON());
      expect(expecting).toMatchObject(expected);
    }
  });
  it("caches the graphs", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const graphs = await cube.graphs();
    for (const graphIri of graphs.slice(0, 2)) {
      const dataCubes = await cube.dataCubesByGraphIri(graphIri.value);
      const datacube = dataCubes[0];
      expect(datacube.graphIri).toBe(graphIri.value);
    }
  });
});
