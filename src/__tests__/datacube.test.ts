import { DataCube } from "../datacube";

const cube = new DataCube("https://ld.stadt-zuerich.ch/query");

describe(".datasetByIri()", () => {
  it("takes an IRI", async () => {
    const datasets = await cube.datasets();
    for (const dataset of datasets) {
      const iri = dataset.iri;
      expect(await cube.datasetByIri(iri)).toBe(dataset);
    }
  });
});

describe(".datasetsByGraph()", () => {
  it("takes a graph IRI", async () => {
    const datasets = await cube.datasets();
    const graphs = await cube.graphs();
    for (const graph of graphs) {
      const graphIri = graph.value;
      const expected = datasets.filter((dataset) => dataset.graphIri.equals(graph));
      expect(await cube.datasetsByGraph(graphIri)).toStrictEqual(expected);
    }
  });
});
