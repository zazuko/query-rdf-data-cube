import { namedNode, variable } from "@rdfjs/data-model";
import { NamedNode } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import DataSet, { IDataSetOptions } from "./dataset";
import { generateLangCoalesce, generateLangOptional } from "./query/utils";
import SparqlFetcher from "./sparqlfetcher";

export interface ICubeOptions {
  languages?: string[];
}

type SerializedDataCube = {
  endpoint: string,
  languages: string[],
};

export class DataCube {
  /**
   * Deserializes a DataCube from JSON generated by DataCube#toJSON
   */
  public static fromJSON(json: string): DataCube {
    const obj: SerializedDataCube = JSON.parse(json);
    return new DataCube(obj.endpoint, {
      languages: obj.languages,
    });
  }

  private endpoint: string;
  private languages: string[];
  private fetcher: SparqlFetcher;
  private cachedDatasets: DataSet[];
  private allDatasetsLoaded: boolean = false;
  private cachedGraphs: NamedNode[];
  private graphsLoaded: boolean = false;

  /**
   * A DataCube queries a SPARQL endpoint and retrieves [[DataSet]]s and
   * their [[Dimension]]s, [[Measure]]s and [[Attribute]]s.
   * @class DataCube
   * @param endpoint SPARQL endpoint
   * @param options Options
   * @param options.languages Languages in which to get the labels, by priority, e.g. `["de", "en"]`.
   * Passed down to [[DataSet]]s and [[DataSetQuery]].
   */
  constructor(endpoint: string, options: ICubeOptions = {}) {
    this.endpoint = endpoint;
    this.languages = options.languages || ["de", "it"];
    this.fetcher = new SparqlFetcher(endpoint);
    this.cachedDatasets = [];
    this.cachedGraphs = [];
  }

  /**
   * Serializes a DataCube to JSON in a way that makes it deserializable
   * by calling DataCube#fromJSON
   */
  public toJSON(): string {
    const obj: SerializedDataCube = {
      endpoint: this.endpoint,
      languages: this.languages,
    };
    return JSON.stringify(obj);
  }

  /**
   * Fetch all [[DataSet]]s from the endpoint.
   */
  public async datasets(): Promise<DataSet[]> {
    if (this.allDatasetsLoaded) {
      return this.cachedDatasets;
    }

    const sparql = this.generateQuery();
    const queryResult = await this.fetcher.select(sparql);
    this.cacheDatasets(queryResult);
    this.allDatasetsLoaded = true;
    return this.cachedDatasets;
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
  public async datasetsByGraphIri(iri: string): Promise<DataSet[]> {
    const datasets = this.cachedDatasets.filter((ds) => ds.graphIri === iri);
    if (datasets.length) {
      return datasets;
    }
    const graphIri = namedNode(iri);

    const sparql = this.generateQuery(graphIri);
    const queryResult = await this.fetcher.select(sparql);
    if (!queryResult.length) {
      // avoid infinite recursion
      throw new Error(`Cannot find graph <${iri}> in ${this.endpoint}`);
    }
    this.cacheDatasets(queryResult.map((result) => {
      result.graphIri = graphIri;
      return result;
    }));
    return this.datasetsByGraphIri(iri);

  }

  /**
   * Fetch all graphs from the endpoint.
   */
  public async graphs(): Promise<NamedNode[]> {
    if (this.graphsLoaded) {
      return this.cachedGraphs;
    }
    const query = "SELECT DISTINCT ?graph WHERE { GRAPH ?graph {?s ?p ?o} }";
    const graphs = await this.fetcher.select(query);
    this.graphsLoaded = true;
    return this.cachedGraphs = graphs.map(({ graph }) => graph);
  }

  private cacheDatasets(datasets) {
    const datasetsByIri = datasets.reduce((acc, { iri, label, graphIri }) => {
      if (!acc[iri.value]) {
        acc[iri.value] = {
          iri,
          labels: [],
          graphIri,
          languages: this.languages,
        };
      }
      acc[iri.value].labels.push({
        value: label.value,
        language: label.language,
      });
      return acc;
    }, {});

    this.cachedDatasets = Array.from(new Set([...Object.values(datasetsByIri)
      .map((dataset: IDataSetOptions) => new DataSet(this.endpoint, dataset)),
      ...this.cachedDatasets]));
  }

  private generateQuery(graphIri?: NamedNode) {
    const graphIriBinding = variable("graphIri");
    const iriBinding = variable("iri");
    const labelBinding = variable("label");

    const bindings = {
      binding: iriBinding,
      labelBinding,
      labelLangBinding: variable(`${labelBinding.value}Lang`),
    };

    const query = {
      queryType: "SELECT",
      variables: [
        iriBinding,
        graphIriBinding,
        labelBinding,
      ],
      where: [
        {
          type: "graph",
          name: graphIri || graphIriBinding,
          patterns: [
            {
              type: "bgp",
              triples: [
                {
                  subject: iriBinding,
                  predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
                  object: namedNode("http://purl.org/linked-data/cube#DataSet"),
                },
              ],
            },
            generateLangOptional(bindings, this.languages),
          ],
        },
        generateLangCoalesce(bindings, this.languages),
      ],
      type: "query",
    };

    const generator = new SparqlGenerator({ allPrefixes: true });
    return generator.stringify(query);
  }
}
