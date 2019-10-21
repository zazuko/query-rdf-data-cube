<a name="0.2.1"></a>
## [0.2.1](https://github.com/zazuko/query-rdf-data-cube/compare/v0.2.0...v0.2.1) (2019-10-21)


### Bug Fixes

* export new types ([a25a2e3](https://github.com/zazuko/query-rdf-data-cube/commit/a25a2e3))



<a name="0.2.0"></a>
# [0.2.0](https://github.com/zazuko/query-rdf-data-cube/compare/v0.1.2...v0.2.0) (2019-10-21)


### Features

* **datacube:** get extra metadata on datacubes ([8ee33f9](https://github.com/zazuko/query-rdf-data-cube/commit/8ee33f9))



<a name="0.1.2"></a>
## [0.1.2](https://github.com/zazuko/query-rdf-data-cube/compare/v0.1.1...v0.1.2) (2019-09-30)


### Bug Fixes

* **filter:** handles more than 2 filters ([148301d](https://github.com/zazuko/query-rdf-data-cube/commit/148301d))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/zazuko/query-rdf-data-cube/compare/v0.1.0...v0.1.1) (2019-09-26)


### Bug Fixes

* **query:** avoid naming variables ?1 ?2 ?3 ([538aac3](https://github.com/zazuko/query-rdf-data-cube/commit/538aac3))



<a name="0.1.0"></a>
# [0.1.0](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.11...v0.1.0) (2019-09-25)


### Bug Fixes

* **caching:** components cached on cube don't get overridden ([d3f2081](https://github.com/zazuko/query-rdf-data-cube/commit/d3f2081))
* **serialization:** serialized cubes have components as obj, not strings ([c48275e](https://github.com/zazuko/query-rdf-data-cube/commit/c48275e))


### Features

* **query:** create smarter names for SPARQL variables than ?tmpVar{n} ([df5770d](https://github.com/zazuko/query-rdf-data-cube/commit/df5770d))



<a name="0.0.11"></a>
## [0.0.11](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.10...v0.0.11) (2019-09-24)


### Bug Fixes

* **case:** s/datacube/dataCube/ ([e756bde](https://github.com/zazuko/query-rdf-data-cube/commit/e756bde))
* **operators:** xsd:dateTime is different than xsd:date ([66fddff](https://github.com/zazuko/query-rdf-data-cube/commit/66fddff))
* **query:** distinct is mainly available on query objects ([43a813b](https://github.com/zazuko/query-rdf-data-cube/commit/43a813b))


### Features

* **component:** get component values and min/max values ([cefd4e5](https://github.com/zazuko/query-rdf-data-cube/commit/cefd4e5))
* **query:** componentMinMax is available on queries ([85c0d96](https://github.com/zazuko/query-rdf-data-cube/commit/85c0d96))
* **query:** componentValues is available on queries ([6ac3e73](https://github.com/zazuko/query-rdf-data-cube/commit/6ac3e73))



<a name="0.0.10"></a>
## [0.0.10](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.9...v0.0.10) (2019-09-16)


### Bug Fixes

* POST as form data to avoid CORS issues ([ab39461](https://github.com/zazuko/query-rdf-data-cube/commit/ab39461))



<a name="0.0.9"></a>
## [0.0.9](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.8...v0.0.9) (2019-09-11)


### Bug Fixes

* **fetch:** bind fetch to window when window exists ([f6d0887](https://github.com/zazuko/query-rdf-data-cube/commit/f6d0887))
* no circular imports ([8f62c71](https://github.com/zazuko/query-rdf-data-cube/commit/8f62c71))
* test imports ([17105e4](https://github.com/zazuko/query-rdf-data-cube/commit/17105e4))
* **component:** ordering is carried over ([fcc581e](https://github.com/zazuko/query-rdf-data-cube/commit/fcc581e))
* **lang:** remove test default languages ([10ed7c1](https://github.com/zazuko/query-rdf-data-cube/commit/10ed7c1))


<a name="0.0.5"></a>
## [0.0.5](https://github.com/zazuko/query-rdf-data-cube/compare/v0.0.4...v0.0.5) (2019-09-10)


### Features

* **datacube:** fetch is configurable at datacube instantiation ([c93abff](https://github.com/zazuko/query-rdf-data-cube/commit/c93abff))


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



