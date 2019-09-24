import fetch from "fetch-vcr";

fetch.configure({
  fixturePath: "./_fixtures",
  // https://github.com/philschatz/fetch-vcr#what-are-the-different-modes
  mode: "playback",
});

export { fetch };
