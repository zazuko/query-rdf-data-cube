import { SparqlEndpointFetcher } from "fetch-sparql-endpoint";
import { Stream } from "stream";

class SparqlFetcher {
  private endpoint: string;
  private fetcher: any = new SparqlEndpointFetcher();

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    // this.fetcher.sparqlParsers["application/json"] = {
    //   parseBooleanStream: (sparqlResponseStream) =>
    //     this.fetcher.sparqlJsonParser.parseJsonBooleanStream(sparqlResponseStream),
    //   parseResultsStream: (sparqlResponseStream) =>
    //     this.fetcher.sparqlJsonParser.parseJsonResultsStream(sparqlResponseStream),
    // };
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
