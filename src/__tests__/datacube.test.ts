import { DataCube } from "../datacube";

describe(".datasetByIri()", () => {
  it("takes an IRI", async () => {
    const cube = new DataCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    for (const dataset of datasets) {
      const iri = dataset.iri;
      expect(await cube.datasetByIri(iri)).toMatchObject(dataset);
    }
  });
  it("caches the datasets", async () => {
    const cube = new DataCube("https://ld.stadt-zuerich.ch/query");
    const datasets = await cube.datasets();
    const cube2 = new DataCube("https://ld.stadt-zuerich.ch/query");
    for (const dataset of datasets.slice(0, 2)) {
      const dataSetIri = dataset.iri;
      const datasetFound = await cube2.datasetByIri(dataSetIri);
      expect(datasetFound.toJSON()).toBe(dataset.toJSON());
    }
  });
});

describe(".datasetsByGraphIri()", () => {
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
  it("caches the graphs", async () => {
    const cube = new DataCube("https://ld.stadt-zuerich.ch/query");
    const graphs = await cube.graphs();
    for (const graphIri of graphs.slice(0, 2)) {
      const datasets = await cube.datasetsByGraphIri(graphIri.value);
      const dataset = datasets[0];
      expect(dataset.graphIri).toBe(graphIri.value);
    }
  });
});
