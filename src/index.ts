#!/usr/bin/env node

import { realpathSync } from "fs";
import * as process from "process";
import { pathToFileURL } from "url";
import createDocumentation from "./create_documentation.js";

if (process.argv.length < 4) {
  /* eslint-disable no-console */
  console.error(
    "Error: The documentation generator needs at least two arguments: " +
      "the input directory and the output directory"
  );
  /* eslint-enable no-console */
  process.exit(1);
}

if (wasCalledAsScript()) {
  // TODO better args
  const inDir = process.argv[2];
  const outDir = process.argv[3];
  const version = process.argv[4];

  async function main(): Promise<void> {
    createDocumentation(inDir, outDir, {
      version,
    });
  }
  main();
}

function wasCalledAsScript() {
  const realPath = realpathSync(process.argv[1]);
  const realPathAsUrl = pathToFileURL(realPath).href;
  return import.meta.url === realPathAsUrl;
}
export default createDocumentation;
