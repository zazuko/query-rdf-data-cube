import { namedNode, variable } from "@rdfjs/data-model";
import namespace from "@rdfjs/namespace";
import { Literal, NamedNode, Term } from "rdf-js";
import { Generator as SparqlGenerator } from "sparqljs";
import { Attribute, Component, Dimension, Measure } from "./components";
import { EntryPointOptions } from "./entrypoint";
import { Query, QueryOptions } from "./query";
import { generateLangCoalesce, generateLangOptionals, prefixes } from "./queryutils";
import { SparqlFetcher } from "./sparqlfetcher";
import { SelectQuery } from "./sparqljs";

/**
 * @ignore
 */
type ComponentsCache = {
  attributes: Map<string, Attribute>,
  dimensions: Map<string, Dimension>,
  measures: Map<string, Measure>,
};
/**
 * @ignore
 */
type GroupedComponents = { kind: Term, iri: Term, labels: Label[] };

type SerializedDataCube = {
  endpoint: string,
  iri: string,
  graphIri: string,
  labels: Label[],
  languages: string[],
  components: {
    dimensions: string[],
    measures: string[],
    attributes: string[],
  },
};

/**
 * Represents an RDF
 * [language-tagged string](https://www.w3.org/TR/rdf11-concepts/#dfn-language-tagged-string).
 */
export interface Label {
  /**
   * String value
   */
  value: string;
  /**
   * Language tag such as "en", "fr", "de".
   * See [Tags for Identifying Languages](https://tools.ietf.org/html/bcp47).
   */
  language: string;
}

export interface DataCubeOptions extends EntryPointOptions {
  iri: NamedNode;
  labels?: Label[];
  graphIri: NamedNode;
}

const cube = namespace("http://purl.org/linked-data/cube#");

/**
 * @class DataCube
 */
export class DataCube {
  /**
   * Deserializes a [[DataCube]] from JSON generated by [[toJSON]]
   */
  public static fromJSON(json: string): DataCube {
    const obj: SerializedDataCube = JSON.parse(json);
    const dataCube = new DataCube(obj.endpoint, {
      iri: namedNode(obj.iri),
      graphIri: namedNode(obj.graphIri),
      labels: obj.labels,
      languages: obj.languages,
    });
    ["dimensions", "measures", "attributes"].forEach((componentTypes) => {
      dataCube.cachedComponents[componentTypes] = obj.components[componentTypes]
        .map(Component.fromJSON)
        .reduce((cache: Map<string, Component>, component: Component) => {
          cache.set(component.iri.value, component);
          return cache;
        }, new Map());
    });
    return dataCube;
  }

  public labels: Label[];
  public iri: string;
  public endpoint: string;
  public graphIri?: string;
  private languages: string[];
  private fetcher: SparqlFetcher;
  private componentsLoaded: boolean = false;
  private cachedComponents: ComponentsCache;

   /**
    * @param endpoint SPARQL endpoint where the DataCube lives.
    * @param options Additional info about the DataCube.
    * @param options.iri The IRI of the DataCube.
    * @param options.graphIri The IRI of the graph from which the data will be fetched.
    * @param options.labels (Optional) A list of labels for the DataCube in the following form:
    * `[ { value: "Something", language: "en" }, { value: "Etwas", language: "de" }, … ]`
    * @param options.languages Languages in which to get the labels, by priority, e.g. `["de", "en"]`.
    */
  constructor(
    endpoint: string,
    options: DataCubeOptions,
  ) {
    const { iri, labels, graphIri } = options;
    this.fetcher = new SparqlFetcher(endpoint);
    this.endpoint = endpoint;
    this.iri = iri.value;
    this.graphIri = graphIri.value;
    this.labels = labels || [];
    this.languages = options.languages || [];
    this.cachedComponents = {
      dimensions: new Map(),
      measures: new Map(),
      attributes: new Map(),
    };
  }

  /**
   * Serializes a [[DataCube]] to JSON in a way that makes it deserializable
   * by calling [[fromJSON]]
   */
  public toJSON(): string {
    const dimensions = Array.from(this.cachedComponents.dimensions.values())
      .map((component) => component.toJSON());
    const measures = Array.from(this.cachedComponents.measures.values())
      .map((component) => component.toJSON());
    const attributes = Array.from(this.cachedComponents.attributes.values())
      .map((component) => component.toJSON());
    const obj: SerializedDataCube = {
      endpoint: this.endpoint,
      iri: this.iri,
      graphIri: this.graphIri,
      labels: this.labels,
      languages: this.languages,
      components: {
        dimensions,
        measures,
        attributes,
      },
    };
    return JSON.stringify(obj);
  }

  /**
   * Fetch all [[Attribute]]s from the [[DataCube]].
   */
  public async attributes(): Promise<Attribute[]> {
    await this.components();
    return Array.from(this.cachedComponents.attributes.values());
  }

  /**
   * Fetch all [[Dimension]]s from the [[DataCube]].
   */
  public async dimensions(): Promise<Dimension[]> {
    await this.components();
    return Array.from(this.cachedComponents.dimensions.values());
  }

  /**
   * Fetch all [[Measure]]s from the [[DataCube]].
   */
  public async measures(): Promise<Measure[]> {
    await this.components();
    return Array.from(this.cachedComponents.measures.values());
  }

  /**
   * Start a new query on the DataCube.
   */
  public query(opts: QueryOptions = {}): Query {
    if (!opts.languages) {
      opts.languages = this.languages;
    }
    return new Query(this, opts);
  }

  public async componentValues(component: Component): Promise<Array<{label: Literal, value: NamedNode}>> {
    if (!component || !component.componentType) {
      throw new Error(`dataCube#componentValues expects valid component, got ${component} instead`);
    }
    const binding = variable("value");
    const labelBinding = variable("label");
    const observation = variable("observation");

    const query: SelectQuery = {
      prefixes,
      queryType: "SELECT",
      variables: [binding, labelBinding],
      distinct: true,
      from: { default: [namedNode(this.graphIri)], named: [] },
      where: [
        {
          type: "bgp",
          triples: [
            {
              subject: observation,
              predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              object: cube("Observation"),
            },
            {
              subject: observation,
              predicate: component.iri,
              object: binding,
            },
            {
              subject: observation,
              predicate: cube("dataSet"),
              object: namedNode(this.iri),
            },
          ],
        },
        ...generateLangOptionals(binding, labelBinding, this.languages),
        generateLangCoalesce(labelBinding, this.languages),
      ],
      type: "query",
    };

    const generator = new SparqlGenerator({ allPrefixes: true });
    const sparql = generator.stringify(query);
    return await this.fetcher.select(sparql);
  }

  public async componentMinMax(component: Component): Promise<{min: Literal, max: Literal}|null> {
    if (!component || !component.componentType) {
      throw new Error(`dataCube#componentMinMax expects valid component, got ${component} instead`);
    }
    const binding = variable("value");
    const observation = variable("observation");

    const query: SelectQuery = {
      prefixes,
      queryType: "SELECT",
      variables: [
        {
          expression: {
            expression: binding,
            type: "aggregate",
            aggregation: "min",
            distinct: false,
          },
          variable: variable("min"),
        },
        {
          expression: {
            expression: binding,
            type: "aggregate",
            aggregation: "max",
            distinct: false,
          },
          variable: variable("max"),
        },
      ],
      from: { default: [namedNode(this.graphIri)], named: [] },
      where: [
        {
          type: "bgp",
          triples: [
            {
              subject: observation,
              predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              object: cube("Observation"),
            },
            {
              subject: observation,
              predicate: component.iri,
              object: binding,
            },
            {
              subject: observation,
              predicate: cube("dataSet"),
              object: namedNode(this.iri),
            },
          ],
        },
        {
          type: "filter",
          expression: {
            type: "operation",
            operator: "isliteral",
            args: [binding],
          },
        },
      ],
      type: "query",
    };

    const generator = new SparqlGenerator({ allPrefixes: true });
    const sparql = generator.stringify(query);
    const results = await this.fetcher.select(sparql);
    if (results.length) {
      return results[0];
    }
    return null;
  }

  private async components() {
    if (this.componentsLoaded) {
      return;
    }

    const binding = variable("iri");
    const labelBinding = variable("label");

    const query: SelectQuery = {
      prefixes,
      queryType: "SELECT",
      variables: [
        binding,
        variable("kind"),
        labelBinding,
      ],
      from: { default: [namedNode(this.graphIri)], named: [] },
      where: [
        {
          type: "bgp",
          triples: [
            {
              subject: namedNode(this.iri),
              predicate: namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
              object: cube("DataSet"),
            },
            {
              subject: namedNode(this.iri),
              predicate: {
                type: "path",
                pathType: "/",
                items: [
                  cube("structure"),
                  cube("component"),
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
        {
          type: "filter",
          expression: {
            type: "operation",
            operator: "in",
            args: [
              variable("kind"),
              [
                cube("attribute"),
                cube("dimension"),
                cube("measure"),
              ],
            ],
          },
        },
        ...generateLangOptionals(binding, labelBinding, this.languages),
        generateLangCoalesce(labelBinding, this.languages),
      ],
      type: "query",
    };

    const generator = new SparqlGenerator({ allPrefixes: true });
    const sparql = generator.stringify(query);

    const components = await this.fetcher.select(sparql);
    const componentsByIri = components.reduce((acc, { kind, label, iri }) => {
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
    const groupedComponents: GroupedComponents[] = Object.values(componentsByIri);

    this.cachedComponents = groupedComponents
      .reduce((componentsProp: ComponentsCache, { kind, labels, iri }) => {
        switch (kind.value) {
          case "http://purl.org/linked-data/cube#attribute":
            componentsProp.attributes.set(iri.value, new Attribute({ labels, iri }));
            break;
          case "http://purl.org/linked-data/cube#dimension":
            componentsProp.dimensions.set(iri.value, new Dimension({ labels, iri }));
            break;
          case "http://purl.org/linked-data/cube#measure":
            componentsProp.measures.set(iri.value, new Measure({ labels, iri }));
            break;
          default:
            throw new Error(`Unknown component kind ${kind.value}`);
        }
        return componentsProp;
      }, {
        attributes: new Map(),
        dimensions: new Map(),
        measures: new Map(),
      });

    this.componentsLoaded = true;
  }
}
