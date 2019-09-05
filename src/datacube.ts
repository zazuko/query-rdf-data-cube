import { namedNode, variable } from "@rdfjs/data-model";
import { NamedNode } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import DataSet from "./dataset";
import { generateLangCoalesce, generateLangOptional } from "./query/utils";
import SparqlFetcher from "./sparqlfetcher";
import { BgpPattern, BindPattern, BlockPattern, GraphPattern } from "./sparqljs";

export interface ICubeOpts {
  languages?: string[];
}

export class DataCube {
  private endpoint: string;
  private languages: string[];
  private fetcher: SparqlFetcher;
  private cachedDatasets: DataSet[];
  private datasetsLoaded: boolean = false;
  private cachedGraphs: NamedNode[];
  private graphsLoaded: boolean = false;

  /**
   * A DataCube queries a SPARQL endpoint and retrieves [[DataSet]]s and
   * their [[Dimension]]s, [[Measure]]s and [[Attribute]]s.
   * @class DataCube
   * @param endpoint SPARQL endpoint
   * @param opts Options
   * @param opts.languages Languages in which to get the labels, by priority, e.g. `["de", "en"]`.
   * Passed down to [[DataSet]]s and [[DataSetQuery]].
   */
  constructor(endpoint: string, opts: ICubeOpts = {}) {
    this.endpoint = endpoint;
    this.languages = opts.languages || [];
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
    const dataSetIriBinding = variable("dataSetIri");
    const graphIriBinding = variable("graphIri");
    const labelBinding = variable("dataSetLabel");

    const bindings = {
      binding: dataSetIriBinding,
      labelBinding,
      labelLangBinding: variable(`${labelBinding.value}Lang`),
    };

    const query = {
      queryType: "SELECT",
      variables: [
        dataSetIriBinding,
        graphIriBinding,
        labelBinding,
      ],
      where: [
        {
          type: "graph",
          name: graphIriBinding,
          patterns: [
            {
              type: "bgp",
              triples: [
                {
                  subject: dataSetIriBinding,
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
    const sparql = generator.stringify(query);
    const datasets = await this.fetcher.select(sparql);
    this.datasetsLoaded = true;
    return this.cachedDatasets = datasets.map(({ dataSetIri, dataSetLabel, graphIri }) =>
      new DataSet(this.endpoint, { dataSetIri, dataSetLabel, graphIri }));
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
