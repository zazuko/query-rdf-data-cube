import { DataCube } from "../datacube";

describe(".datasetByIri()", () => {
  it("takes an IRI", async () => {
    const cube = new DataCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    for (const dataset of datasets) {
      const iri = dataset.iri;
      expect(await cube.datasetByIri(iri)).toBe(dataset);
    }
  });
});

describe(".datasetsByGraph()", () => {
  it("takes a graph IRI", async () => {
    const cube = new DataCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    const cube2 = new DataCube("https://ld.stadt-zuerich.ch/query");
    for (const dataset of datasets.slice(0, 3)) {
      const graphIri = dataset.graphIri;
      const expecting = (await cube2.datasetsByGraphIri(graphIri)).map((ds) => ds.toJSON());
      const expected = datasets.filter((ds) => ds.graphIri === graphIri).map((ds) => ds.toJSON());
      expect(expecting).toMatchObject(expected);
    }
  });
});
