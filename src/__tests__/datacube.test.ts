// tslint:disable: max-line-length
import fetch from "../../fetch-mock";
import { DataCube, ICubeOptions } from "../datacube";

const newCube = (endpoint: string, languages?: string[]) => {
  const options: ICubeOptions = {
    fetcher: {
      fetch,
    },
  };
  if (languages) {
    options.languages = languages;
  }
  return new DataCube(endpoint, options);
};

describe("DataCube", () => {
  it("reports HTTP errors", async () => {
    const cube = newCube("http://example.com");
    expect(cube.datasets()).rejects.toMatchInlineSnapshot(
      `[FetchError: invalid json response body at http://example.com/ reason: Unexpected token < in JSON at position 0]`,
    );
  });
  it("reports parsing errors", async () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#error-message",
    );
    expect(cube.datasets()).rejects.toMatchInlineSnapshot(
      `[Error: error on this endpoint]`,
    );
  });
  it("reports bad data", async () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#bad-data",
    );
    expect(cube.datasets()).rejects.toMatchInlineSnapshot(
      `[Error: Endpoint returned bad binding: {"type":"a bad type","value":"http://example.org/anzahl-forstbetriebe/dataset"}]`,
    );
  });
  it("handles bnodes", async () => {
    const cube = newCube(
      "https://trifid-lindas.test.cluster.ldbar.ch/query#handles-bnodes",
    );
    const datasets = await cube.datasets();
    expect(datasets[0].iri).toBe("someBlankNode");
  });
});

describe(".datasetByIri()", () => {
  it("takes an IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    for (const dataset of datasets) {
      const iri = dataset.iri;
      expect(await cube.datasetByIri(iri)).toMatchObject(dataset);
    }
  });
  it("caches the datasets", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const dataset of datasets.slice(0, 2)) {
      const dataSetIri = dataset.iri;
      const datasetFound = await cube2.datasetByIri(dataSetIri);
      expect(datasetFound.toJSON()).toBe(dataset.toJSON());
    }
  });
});

describe(".datasetsByGraphIri()", () => {
  it("takes a graph IRI", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    const cube2 = newCube("https://ld.stadt-zuerich.ch/query");
    for (const dataset of datasets.slice(0, 3)) {
      const graphIri = dataset.graphIri;
      const expecting = (await cube2.datasetsByGraphIri(graphIri)).map((ds) =>
        ds.toJSON(),
      );
      const expected = datasets
        .filter((ds) => ds.graphIri === graphIri)
        .map((ds) => ds.toJSON());
      expect(expecting).toMatchObject(expected);
    }
  });
  it("caches the graphs", async () => {
    const cube = newCube("https://ld.stadt-zuerich.ch/query");
    const graphs = await cube.graphs();
    for (const graphIri of graphs.slice(0, 2)) {
      const datasets = await cube.datasetsByGraphIri(graphIri.value);
      const dataset = datasets[0];
      expect(dataset.graphIri).toBe(graphIri.value);
    }
  });
});
