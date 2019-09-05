import { NamedNode, Term } from "rdf-js";
import Attribute from "./components/attribute";
import Dimension from "./components/dimension";
import Measure from "./components/measure";
import DataSetQuery from "./query/datasetquery";
import { IQueryOpts } from "./query/utils";
import SparqlFetcher from "./sparqlfetcher";

class DataSet {
  public label: any;
  public iri: string;
  public endpoint: string;
  public graphIri?: string;
  private fetcher: SparqlFetcher;
  private metadataLoaded: boolean = false;
  private cachedMetadata: { attributes: Attribute[]; dimensions: Dimension[]; measures: Measure[]; };

   /**
    * @param endpoint SPARQL endpoint where the DataSet lives.
    * @param options Additional info about the DataSet.
    * @param options.dataSetIri The IRI of the DataSet.
    * @param options.dataSetLabel (Optional) A label for the DataSet.
    * @param options.graphIri The IRI of the graph from which the data will be fetched.
    */
  constructor(
    endpoint: string,
    options: { dataSetIri: NamedNode, dataSetLabel?: Term, graphIri: NamedNode },
  ) {
    const { dataSetIri, dataSetLabel, graphIri } = options;
    this.fetcher = new SparqlFetcher(endpoint);
    this.iri = dataSetIri.value;
    this.label = (dataSetLabel && dataSetLabel.value) || "";
    this.graphIri = graphIri.value;
    this.endpoint = endpoint;
  }

  /**
   * Fetch all [[Attribute]]s from the DataSet.
   */
  public async attributes(): Promise<Attribute[]> {
    await this.metadata();
    return this.cachedMetadata.attributes;
  }

  /**
   * Fetch all [[Dimension]]s from the DataSet.
   */
  public async dimensions(): Promise<Dimension[]> {
    await this.metadata();
    return this.cachedMetadata.dimensions;
  }

  /**
   * Fetch all [[Measure]]s from the DataSet.
   */
  public async measures(): Promise<Measure[]> {
    await this.metadata();
    return this.cachedMetadata.measures;
  }

  /**
   * Start a new query on the DataSet.
   */
  public query(opts: IQueryOpts = {}): DataSetQuery {
    return new DataSetQuery(this, opts);
  }

  private async metadata() {
    if (this.metadataLoaded) {
      return;
    }
    const query = `
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX qb: <http://purl.org/linked-data/cube#>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

      SELECT ?label ?kind ?iri

      ${this.graphIri ? `FROM <${this.graphIri}>` : ""}
      WHERE {
        <${this.iri}> a qb:DataSet ;
          qb:structure/qb:component ?componentSpec .
        ?componentSpec ?kind ?iri .
        ?iri rdfs:label|skos:prefLabel ?label .
      }`;

    const metadata = await this.fetcher.select(query);

    this.cachedMetadata = metadata.reduce((metadataProp, { kind, label, iri }) => {
      switch (kind.value) {
        case "http://purl.org/linked-data/cube#attribute":
          metadataProp.attributes.push(new Attribute({label, iri}));
          break;
        case "http://purl.org/linked-data/cube#dimension":
          metadataProp.dimensions.push(new Dimension({label, iri}));
          break;
        case "http://purl.org/linked-data/cube#measure":
          metadataProp.measures.push(new Measure({label, iri}));
          break;
        default:
          throw new Error(`Unknown component kind ${kind.value}`);
      }
      return metadataProp;
    }, {
      attributes: [],
      dimensions: [],
      measures: [],
    });

    this.metadataLoaded = true;
  }
}

export default DataSet;
