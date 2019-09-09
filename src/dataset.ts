import { namedNode, variable } from "@rdfjs/data-model";
import { NamedNode, Term } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import Attribute from "./components/attribute";
import Dimension from "./components/dimension";
import Measure from "./components/measure";
import { ICubeOptions } from "./datacube";
import DataSetQuery from "./query/datasetquery";
import { generateLangCoalesce, generateLangOptional, IQueryOptions } from "./query/utils";
import SparqlFetcher from "./sparqlfetcher";

type MetadataCache = { attributes: Attribute[], dimensions: Dimension[], measures: Measure[] };
type GroupedMetadata = { kind: Term, iri: Term, labels: Label[] };
export type Label = {
  value: string;
  language?: string;
};

export interface IDataSetOptions extends ICubeOptions {
  iri: NamedNode;
  labels?: Label[];
  graphIri: NamedNode;
}

class DataSet {
  public labels: Label[];
  public iri: string;
  public endpoint: string;
  public graphIri?: string;
  private languages: string[];
  private fetcher: SparqlFetcher;
  private metadataLoaded: boolean = false;
  private cachedMetadata: MetadataCache;

   /**
    * @param endpoint SPARQL endpoint where the DataSet lives.
    * @param options Additional info about the DataSet.
    * @param options.iri The IRI of the DataSet.
    * @param options.labels (Optional) A list of labels for the DataSet in the following form:
    * `[ { value: "Something", language: "en" }, { value: "Etwas", language: "de" }, … ]`
    * @param options.graphIri The IRI of the graph from which the data will be fetched.
    */
  constructor(
    endpoint: string,
    options: IDataSetOptions,
  ) {
    const { iri, labels, graphIri } = options;
    this.fetcher = new SparqlFetcher(endpoint);
    this.endpoint = endpoint;
    this.iri = iri.value;
    this.graphIri = graphIri.value;
    this.labels = labels || [];
    this.languages = options.languages || ["de", "it"];
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
  public query(opts: IQueryOptions = {}): DataSetQuery {
    if (!opts.languages) {
      opts.languages = this.languages;
    }
    return new DataSetQuery(this, opts);
  }

  private async metadata() {
    if (this.metadataLoaded) {
      return;
    }

    const binding = variable("iri");
    const labelBinding = variable("label");
    const labelLangBinding = variable("labelLang");
    const bindings = {
      binding,
      labelBinding,
      labelLangBinding,
    };

    const query = {
      queryType: "SELECT",
      variables: [
        binding,
        variable("kind"),
        labelBinding,
      ],
      from: { default: [ namedNode(this.graphIri) ], named: [] },
      where: [
        {
          type: "bgp",
          triples: [
            {
              subject: namedNode(this.iri),
              predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              object: namedNode("http://purl.org/linked-data/cube#DataSet"),
            },
            {
              subject: namedNode(this.iri),
              predicate: {
                type: "path",
                pathType: "/",
                items: [
                  namedNode("http://purl.org/linked-data/cube#structure"),
                  namedNode("http://purl.org/linked-data/cube#component"),
                ],
              },
              object: variable("componentSpec"),
            },
            {
              subject: variable("componentSpec"),
              predicate: variable("kind"),
              object: binding,
            },
          ],
        },
        generateLangOptional(bindings, this.languages),
        generateLangCoalesce(bindings, this.languages),
      ],
      type: "query",
    };

    const generator = new SparqlGenerator({ allPrefixes: true });
    const sparql = generator.stringify(query);

    const metadata = await this.fetcher.select(sparql);
    const metadataByIri = metadata.reduce((acc, { kind, label, iri }) => {
      if (!acc[iri.value]) {
        acc[iri.value] = {
          kind,
          labels: [],
          iri,
        };
      }
      acc[iri.value].labels.push({
        value: label.value,
        language: label.language,
      });
      return acc;
    }, {});
    const groupedMetadata: GroupedMetadata[] = Object.values(metadataByIri);

    this.cachedMetadata = groupedMetadata
      .reduce((metadataProp: MetadataCache, { kind, labels, iri }) => {
        switch (kind.value) {
          case "http://purl.org/linked-data/cube#attribute":
            metadataProp.attributes.push(new Attribute({ labels, iri }));
            break;
          case "http://purl.org/linked-data/cube#dimension":
            metadataProp.dimensions.push(new Dimension({ labels, iri }));
            break;
          case "http://purl.org/linked-data/cube#measure":
            metadataProp.measures.push(new Measure({ labels, iri }));
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
