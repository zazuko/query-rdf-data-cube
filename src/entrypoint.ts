import { namedNode, variable } from "@rdfjs/data-model";
import { NamedNode, Variable } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import { DataCube, DataCubeOptions, Label } from "./datacube";
import { generateLangCoalesce, generateLangOptionals, labelPredicate, prefixes } from "./queryutils";
import { SparqlFetcher, SparqlFetcherOptions } from "./sparqlfetcher";
import { BindPattern, BlockPattern, SelectQuery } from "./sparqljs";

interface ExtraMetadata {
  variables: Variable[];
  iris: NamedNode[];
  isMultilang: boolean[];
  langOptionals: (variable: Variable) => BlockPattern[];
  langCoalesce: () => BindPattern[];
}

export interface BaseOptions {
  languages?: string[];
  fetcher?: SparqlFetcherOptions;
}

export interface ExtraMetadatum {
  variable: string;
  iri: string;
  multilang?: boolean;
}

export interface EntryPointOptions extends BaseOptions {
  extraMetadata?: ExtraMetadatum[];
}

export type SerializedDataCubeEntryPoint = {
  endpoint: string,
  languages: string[],
  dataCubes: string[],
};

/**
 * ignore
 */
function flatten<T>(items: T[][]): T[] {
  return items.reduce((prev, next) => prev.concat(next), []);
}

export class DataCubeEntryPoint {
  /**
   * Deserializes a DataCubeEntryPoint from JSON generated by DataCubeEntryPoint#toJSON
   */
  public static fromJSON(json: string): DataCubeEntryPoint {
    const obj: SerializedDataCubeEntryPoint = JSON.parse(json);
    const entryPoint = new DataCubeEntryPoint(obj.endpoint, {
      languages: obj.languages,
    });
    entryPoint.cachedDataCubes = obj.dataCubes.reduce((map, str) => {
      const dataCube: DataCube = DataCube.fromJSON(str);
      map.set(dataCube.iri, dataCube);
      return map;
    }, new Map());
    return entryPoint;
  }

  private endpoint: string;
  private languages: string[];
  private fetcher: SparqlFetcher;
  private cachedDataCubes: Map<string, DataCube>;
  private allDataCubesLoaded: boolean = false;
  private cachedGraphs: NamedNode[];
  private graphsLoaded: boolean = false;
  private extraMetadata: ExtraMetadata;

  /**
   * A DataCubeEntryPoint queries a SPARQL endpoint and retrieves [[DataCube]]s and
   * their [[Dimension]]s, [[Measure]]s and [[Attribute]]s.
   * @class DataCubeEntryPoint
   * @param endpoint SPARQL endpoint
   * @param options Options
   * @param options.languages Languages in which to get the labels, by priority, e.g. `["de", "en"]`.
   * Passed down to [[DataCube]]s and [[Query]].
   * @param options.extraMetadata Metadata to fetch, see examples/extra-metadata.ts
   */
  constructor(endpoint: string, options: EntryPointOptions = {}) {
    this.endpoint = endpoint;
    this.languages = options.languages || [];
    this.fetcher = new SparqlFetcher(endpoint, options.fetcher || {});
    this.cachedDataCubes = new Map();
    this.cachedGraphs = [];

    this.extraMetadata = {
      variables: [],
      iris: [],
      isMultilang: [],
      langOptionals: (iriBinding) => {
        return flatten(this.extraMetadata.variables.map((variab, index) => {
          const predicate = this.extraMetadata.iris[index];
          const isMultilang = this.extraMetadata.isMultilang[index];
          const languages = isMultilang ? this.languages : null;
          return generateLangOptionals(iriBinding, variab, predicate, languages);
        }));
      },
      langCoalesce: () => {
        return this.extraMetadata.variables
          .filter((metadata, index) => this.extraMetadata.isMultilang[index])
          .map((variab, index) => {
            return generateLangCoalesce(variab, this.languages);
          });
      },
    };
    const extraMetadata = options.extraMetadata || [];
    extraMetadata.forEach((metadata) => {
      this.extraMetadata.variables.push(variable(metadata.variable));
      this.extraMetadata.iris.push(namedNode(metadata.iri));
      this.extraMetadata.isMultilang.push(Boolean(metadata.multilang));
    });
  }

  /**
   * Serializes a DataCubeEntryPoint to JSON in a way that makes it deserializable
   * by calling DataCubeEntryPoint#fromJSON
   */
  public toJSON(): string {
    const obj: SerializedDataCubeEntryPoint = {
      endpoint: this.endpoint,
      languages: this.languages,
      dataCubes: Array.from(this.cachedDataCubes.values()).map((dataCube) => dataCube.toJSON()),
    };
    return JSON.stringify(obj);
  }

  /**
   * Fetch all [[DataCube]]s from the endpoint.
   */
  public async dataCubes(): Promise<DataCube[]> {
    if (this.allDataCubesLoaded) {
      return Array.from(this.cachedDataCubes.values());
    }

    const sparql = this.generateQuery();
    const queryResult = await this.fetcher.select(sparql);
    this.cacheDataCubes(queryResult);
    this.allDataCubesLoaded = true;
    return Array.from(this.cachedDataCubes.values());
  }

  /**
   * Fetch a [[DataCube]] by its IRI.
   *
   * @param iri IRI of the DataCube to return.
   */
  public async dataCubeByIri(dataCubeIri: string): Promise<DataCube> {
    const found = Array.from(this.cachedDataCubes.values()).find((dataCube) => dataCube.iri === dataCubeIri);
    if (found) {
      return found;
    }
    const sparql = this.generateQuery({ dataCubeIri: namedNode(dataCubeIri) });
    const queryResult = await this.fetcher.select(sparql);
    if (!queryResult.length) {
      throw new Error(`No dataCube with iri <${dataCubeIri}> on ${this.endpoint}`);
    }
    this.cacheDataCubes(queryResult);
    return this.dataCubeByIri(dataCubeIri);
  }

  /**
   * Fetch [[DataCube]]s by their graph IRI.
   *
   * @param graphIri IRI of the graph to look for in all DataCubes.
   */
  public async dataCubesByGraphIri(iri: string): Promise<DataCube[]> {
    const dataCubes = Array.from(this.cachedDataCubes.values())
      .filter((ds) => ds.graphIri === iri);
    if (dataCubes.length) {
      return dataCubes;
    }
    const graphIri = namedNode(iri);

    const sparql = this.generateQuery({ graphIri });
    const queryResult = await this.fetcher.select(sparql);
    if (!queryResult.length) {
      // avoid infinite recursion
      throw new Error(`Cannot find graph <${iri}> in ${this.endpoint}`);
    }
    this.cacheDataCubes(queryResult.map((result) => {
      result.graphIri = graphIri;
      return result;
    }));
    return this.dataCubesByGraphIri(iri);
  }

  /**
   * Fetch all graphs from the endpoint.
   */
  public async graphs(): Promise<NamedNode[]> {
    if (this.graphsLoaded) {
      return this.cachedGraphs;
    }
    const query = `
      PREFIX qb: <http://purl.org/linked-data/cube#>
      SELECT DISTINCT ?graph WHERE {
        GRAPH ?graph {
          ?dataCube a qb:DataSet .
        }
      }
    `;
    const graphs = await this.fetcher.select(query);
    this.graphsLoaded = true;
    return this.cachedGraphs = graphs.map(({ graph }) => graph);
  }

  private cacheDataCubes(dataCubes: Array<{ iri: NamedNode, label: Label, graphIri: string }>) {
    const dataCubesByIri = dataCubes.reduce((acc, obj) => {
      const extraMetadata = new Map();
      this.extraMetadata.variables.forEach((variab) => {
        extraMetadata.set(variab.value, obj[variab.value]);
      });
      const { iri, label, graphIri } = obj;
      acc[iri.value] = {
        iri,
        label: {
          value: label.value,
          language: label.language,
        },
        graphIri,
        languages: this.languages,
        extraMetadata,
      };
      return acc;
    }, {});

    Object.entries(dataCubesByIri)
      .forEach(([iri, dataCube]: [string, DataCubeOptions]) => {
        this.cachedDataCubes.set(iri, new DataCube(this.endpoint, dataCube, this.fetcher));
      });
  }

  private generateQuery({graphIri, dataCubeIri}: {graphIri?: NamedNode, dataCubeIri?: NamedNode} = {}) {
    const graphIriBinding = variable("graphIri");
    const iriBinding = variable("iri");
    const labelBinding = variable("label");

    const query: SelectQuery = {
      prefixes,
      queryType: "SELECT",
      variables: [
        iriBinding,
        graphIriBinding,
        labelBinding,
        ...this.extraMetadata.variables,
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
            ...generateLangOptionals(iriBinding, labelBinding, labelPredicate, this.languages),
            ...this.extraMetadata.langOptionals(iriBinding),
          ],
        },
        generateLangCoalesce(labelBinding, this.languages),
        ...this.extraMetadata.langCoalesce(),
      ],
      type: "query",
    };
    if (dataCubeIri) {
      query.where.push({
        type: "filter",
        expression: {
          type: "operation",
          operator: "=",
          args: [
            iriBinding,
            dataCubeIri,
          ],
        },
      });
    }

    const generator = new SparqlGenerator({ allPrefixes: true });
    return generator.stringify(query);
  }
}
