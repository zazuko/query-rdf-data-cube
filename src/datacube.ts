import { NamedNode } from "rdf-js";
import DataSet from "./dataset";
import SparqlFetcher from "./sparqlfetcher";

export class DataCube {
  private endpoint: string;
  private fetcher: SparqlFetcher;
  private cachedDatasets: DataSet[];
  private datasetsLoaded: boolean = false;
  private cachedGraphs: NamedNode[];
  private graphsLoaded: boolean = false;

  /**
   * @param endpoint SPARQL endpoint
   */
  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.fetcher = new SparqlFetcher(endpoint);
    this.cachedDatasets = [];
    this.cachedGraphs = [];
  }

  /**
   * Fetch all [[DataSet]]s from the endpoint.
   */
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

  /**
   * Fetch a [[DataSet]] by its IRI.
   *
   * @param iri IRI of the DataSet to return.
   */
  public async datasetByIri(iri: string): Promise<DataSet> {
    const datasets = await this.datasets();
    return datasets.find((dataset) => dataset.iri === iri);
  }

  /**
   * Fetch [[DataSet]]s by their graph IRI.
   *
   * @param graphIri IRI of the graph to look for in all DataSets.
   */
  public async datasetsByGraph(graphIri: string): Promise<DataSet[]> {
    const datasets = await this.datasets();
    return datasets.filter((dataset) => dataset.graphIri.value === graphIri);
  }

  /**
   * Fetch all graphs from the endpoint.
   */
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
