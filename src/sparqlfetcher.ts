import { blankNode, literal, namedNode } from "@rdfjs/data-model";
import fetch, { BodyInit, RequestInit, Response } from "node-fetch";
import { Term } from "rdf-js";

/**
 * See https://www.w3.org/TR/2013/REC-sparql11-results-json-20130321/#select-encode-terms
 * @ignore
 */
type RDFTerm =
  | { type: "uri"; value: string; }
  | { type: "literal"; value: string }
  | { type: "literal"; value: string; "xml:lang": string }
  | { type: "literal"; value: string; datatype: string }
  | { type: "bnode"; value: string };

/**
 * @ignore
 */
type Result = Record<string, Term>;

export interface SparqlFetcherOptions {
  fetch?: typeof fetch;
  fetchOptions?: RequestInit;
}

export class SparqlFetcher {
  private fetch: typeof fetch;
  private fetchOptions: RequestInit;
  private endpoint: string;

  constructor(endpoint: string, options: SparqlFetcherOptions = {}) {
    this.endpoint = endpoint;
    this.fetch = options.fetch || fetch;
    if (typeof window !== "undefined" && "fetch" in window) {
      this.fetch = window.fetch.bind(window);
    }
    this.fetchOptions = options.fetchOptions || {
      method: "POST",
      headers: {
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    };
  }

  public async select(query: string): Promise<any[]> {
    const options = this.options(`query=${encodeURIComponent(query)}`);

    return this.fetch(this.endpoint, options)
      .then((r: Response) => {
        if (r.ok) {
          return r.json();
        }
        throw new Error(`HTTP${r.status} ${r.statusText}`);
      })
      .then((body: { results: { bindings: Array<Record<string, RDFTerm>> }, message: string; }): any[] => {
        if (!body.results) {
          throw Error(body.message);
        }

        const results: Result[] = body.results.bindings
          .map((row: Record<string, RDFTerm>) => {
            const rowObject: Result = {};

            Object.keys(row).forEach((column) => {
              rowObject[column] = toRDFDataModel(row[column]);
            });
            return rowObject;
          });

        return results;
      });
  }

  private options(body: BodyInit = ""): RequestInit {
    const options: RequestInit = { ...this.fetchOptions };
    if (body) {
      options.body = body;
    }
    return options;
  }
}

/**
 * @ignore
 */
function toRDFDataModel(binding: RDFTerm): Term {
  switch (binding.type) {
    case "uri":
      return namedNode(binding.value);
    case "literal":
      let languageOrDatatype: any;
      if ("datatype" in binding) {
        languageOrDatatype = binding.datatype;
      } else if ("xml:lang" in binding) {
        languageOrDatatype = binding["xml:lang"];
      }
      return literal(binding.value, languageOrDatatype);
    case "bnode":
      return blankNode(binding.value);
  }
  throw new Error(`Endpoint returned bad binding: ${JSON.stringify(binding)}`);
}
