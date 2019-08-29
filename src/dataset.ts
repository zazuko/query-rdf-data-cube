import { Term } from "rdf-js";
import DataSetQuery from "./datasetquery";
import Attribute from "./expressions/attribute";
import Dimension from "./expressions/dimension";
import Measure from "./expressions/measure";
import SparqlFetcher from "./sparqlfetcher";

class DataSet {
  public label: any;
  public iri: any;
  public endpoint: string;
  public graphIri: Term | undefined;
  private fetcher: SparqlFetcher;
  private metadataLoaded: boolean = false;
  private cachedMetadata: { attributes: Attribute[]; dimensions: Dimension[]; measures: Measure[]; };

  constructor(
    endpoint: string,
    { dataSetIri, dataSetLabel, graphIri }: { dataSetIri: Term, dataSetLabel: Term, graphIri: Term },
  ) {
    this.fetcher = new SparqlFetcher(endpoint);
    this.iri = dataSetIri.value;
    this.label = dataSetLabel.value;
    this.graphIri = graphIri;
    this.endpoint = endpoint;
  }

  public async attributes() {
    await this.metadata();
    return this.cachedMetadata.attributes;
  }

  public async dimensions() {
    await this.metadata();
    return this.cachedMetadata.dimensions;
  }

  public async measures() {
    await this.metadata();
    return this.cachedMetadata.measures;
  }

  public query() {
    return new DataSetQuery(this);
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

      ${this.graphIri ? `FROM <${this.graphIri.value}>` : ""}
      WHERE {
        <${this.iri}> a qb:DataSet ;
          qb:structure/qb:component ?componentSpec .
        ?componentSpec ?kind ?iri .
        ?iri  rdfs:label|skos:prefLabel ?label .
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
