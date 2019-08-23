import { NamedNode } from "rdf-js";
import DataSet from "./dataset";
import SparqlFetcher from "./sparqlfetcher";

class DataCube {
  private endpoint: string;
  private fetcher: SparqlFetcher;
  private cachedDatasets: DataSet[];
  private datasetsLoaded: boolean = false;
  private cachedGraphs: NamedNode[];
  private graphsLoaded: boolean = false;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.fetcher = new SparqlFetcher(endpoint);
    this.cachedDatasets = [];
    this.cachedGraphs = [];
  }

  public async datasets(): Promise<DataSet[]> {
    if (this.datasetsLoaded) {
      return this.cachedDatasets;
    }
    const query = `
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX qb: <http://purl.org/linked-data/cube#>
      SELECT ?dataSetIri ?dataSetLabel ?graphIri WHERE {
        GRAPH ?graphIri {
          ?dataSetIri a qb:DataSet ;
          rdfs:label ?dataSetLabel .
        }
      }
    `;
    const datasets = await this.fetcher.select(query);
    this.datasetsLoaded = true;
    return this.cachedDatasets = datasets.map(({ dataSetIri, dataSetLabel, graphIri }) =>
      new DataSet(this.endpoint, { dataSetIri, dataSetLabel, graphIri }));
  }

  public async graphs(): Promise<NamedNode[]> {
    if (this.graphsLoaded) {
      return this.cachedGraphs;
    }
    const query = "SELECT DISTINCT ?graph WHERE { GRAPH ?graph {?s ?p ?o}}";
    const graphs = await this.fetcher.select(query);
    this.graphsLoaded = true;
    return this.cachedGraphs = graphs.map(({ graph }) => graph);
  }
}

export default DataCube;
