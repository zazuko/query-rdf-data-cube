import fetch from "fetch-vcr";

fetch.configure({
  fixturePath: "./_fixtures",
  mode: "playback",
});

export { fetch };
