import fetch from "fetch-vcr";

fetch.configure({
  fixturePath: "./_fixtures",
  mode: "cache",
});

export default fetch;
