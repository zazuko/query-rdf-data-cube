import { SparqlEndpointFetcher } from "fetch-sparql-endpoint";
import { Stream } from "stream";

class SparqlFetcher {
  private endpoint: string;
  private fetcher: any = new SparqlEndpointFetcher();

  constructor(endpoint: string) {
    if (typeof window === "undefined") {
      this.fetcher = new SparqlEndpointFetcher();
    } else {
      this.fetcher = new SparqlEndpointFetcher({
        fetch: window.fetch.bind(window),
      });
    }
    this.endpoint = endpoint;
    this.fetcher.sparqlParsers["application/json"] = {
      parseResultsStream: (stream: Stream): Stream => stream.pipe(require("JSONStream").parse("$*")),
    };
  }

  public async select(query: string): Promise<any[]> {
    const stream = await this.fetcher.fetchBindings(this.endpoint, query);
    return this.collect(stream);
  }

  private collect(stream: Stream): Promise<any[]> {
    const acc = [];
    stream.on("data", (bindings) => {
      acc.push(bindings);
    });
    return new Promise((resolve, reject) => {
      stream.on("error", (err: any) => {
        reject(err);
      });
      stream.on("end", () => {
        resolve(acc);
      });
    });
  }
}

export default SparqlFetcher;
