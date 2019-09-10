<a name="0.0.8"></a>
## [0.0.8](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.7...v0.0.8) (2019-09-10)



<a name="0.0.7"></a>
## [0.0.7](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.6...v0.0.7) (2019-09-10)



<a name="0.0.6"></a>
## [0.0.6](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.5...v0.0.6) (2019-09-10)



<a name="0.0.5"></a>
## [0.0.5](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.4...v0.0.5) (2019-09-10)


### Features

* **datacube:** fetch is configurable at datacube instantiation ([c93abff](https://github.com/zazuko/query-rdf-data-cube/commit/c93abff))



<a name="0.0.4"></a>
## [0.0.4](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.3...v0.0.4) (2019-09-09)



<a name="0.0.3"></a>
## [0.0.3](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.2...v0.0.3) (2019-09-09)


### Bug Fixes

* **datacube:** querying dataset by IRI does not fetch all datasets ([7ba4936](https://github.com/zazuko/query-rdf-data-cube/commit/7ba4936))
* **dataset:** #graphs only return graphs related to a dataset ([7df53f5](https://github.com/zazuko/query-rdf-data-cube/commit/7df53f5))
* **dataset:** graphIri is a string, not a namedNode ([2ec850c](https://github.com/zazuko/query-rdf-data-cube/commit/2ec850c))
* **lang:** labels default to '' instead of defaulting to an IRI ([a7a37f7](https://github.com/zazuko/query-rdf-data-cube/commit/a7a37f7))
* **query:** binding/comp maps use Map interface ([4979630](https://github.com/zazuko/query-rdf-data-cube/commit/4979630))
* **query:** orderBy is always taken into account ([b0b0eb5](https://github.com/zazuko/query-rdf-data-cube/commit/b0b0eb5))


### Features

* **component:** components can have one label per language ([9b659be](https://github.com/zazuko/query-rdf-data-cube/commit/9b659be))
* **cube:** implement languages for datasets fetching ([e1411a2](https://github.com/zazuko/query-rdf-data-cube/commit/e1411a2))
* **datacube:** fetch datasets by an IRI or a graph IRI ([42f67b2](https://github.com/zazuko/query-rdf-data-cube/commit/42f67b2))
* **dataset:** datasets can have one label per language ([edd7879](https://github.com/zazuko/query-rdf-data-cube/commit/edd7879))
* **lang:** dataset passes down lang info to queries ([ea9bf11](https://github.com/zazuko/query-rdf-data-cube/commit/ea9bf11))
* **query:** get labels with language preferences ([1602a43](https://github.com/zazuko/query-rdf-data-cube/commit/1602a43))
* **serialization:** implement #toJSON and .fromJSON ([04d0e39](https://github.com/zazuko/query-rdf-data-cube/commit/04d0e39))



<a name="0.0.2"></a>
## 0.0.2 (2019-09-04)


### Bug Fixes

* all variables in projection should be present in GROUP BY ([fcdf852](https://github.com/zazuko/query-rdf-data-cube/commit/fcdf852))
* bind fetch to window in browser context ([0eafbcc](https://github.com/zazuko/query-rdf-data-cube/commit/0eafbcc))
* querying a dataset should restrict on its dataset IRI ([e53d801](https://github.com/zazuko/query-rdf-data-cube/commit/e53d801))
* report query errors from endpoint ([e909969](https://github.com/zazuko/query-rdf-data-cube/commit/e909969))
* **query:** empty SELECTs should select all dimensions ([8ff9359](https://github.com/zazuko/query-rdf-data-cube/commit/8ff9359))
* **query:** fetch labels and group results by label+value ([effc6aa](https://github.com/zazuko/query-rdf-data-cube/commit/effc6aa))


### Features

* add more filters ([d8964da](https://github.com/zazuko/query-rdf-data-cube/commit/d8964da))
* apply filters ([6dfb9a5](https://github.com/zazuko/query-rdf-data-cube/commit/6dfb9a5))
* implement .orderBy ([4f9ea69](https://github.com/zazuko/query-rdf-data-cube/commit/4f9ea69))



