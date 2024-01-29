#!/usr/bin/env node

import { realpathSync } from "fs";
import * as process from "process";
import { pathToFileURL } from "url";
import type { DocumentationCreationOptions } from "./create_documentation.js";
import createDocumentation from "./create_documentation.js";
import currentReadmeVersion from "./version.js";

if (wasCalledAsScript()) {
  const args = processArgs();
  function main(): void {
    createDocumentation(args.baseInDir, args.baseOutDir, args.options).catch(
      (err) => {
        const srcMessage =
          ((err as { message: string }) ?? {}).message ?? "Unknown error";
        // eslint-disable-next-line no-console
        console.error(
          "ERROR: failed to generated documentation: " + srcMessage,
        );
        process.exit(1);
      },
    );
  }
  main();
}

export default createDocumentation;

function wasCalledAsScript() {
  const realPath = realpathSync(process.argv[1]);
  const realPathAsUrl = pathToFileURL(realPath).href;
  return import.meta.url === realPathAsUrl;
}

function processArgs(): {
  baseInDir: string;
  baseOutDir: string;
  options: DocumentationCreationOptions;
} {
  let inDir;
  let outDir;
  let version: string | undefined;

  let shouldClean = false;
  let currentFlag: "input" | "output" | "project-version" | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (currentFlag === undefined && arg[0] === "-") {
      if (arg[1] === "-") {
        switch (arg.substring(2).trim()) {
          case "version":
            /* eslint-disable-next-line no-console */
            console.log(`v${currentReadmeVersion}`);
            process.exit(0);
          case "input":
            currentFlag = "input";
            break;
          case "output":
            currentFlag = "output";
            break;
          case "project-version":
            currentFlag = "project-version";
            break;
          case "clean":
            shouldClean = true;
            break;
          case "help":
            displayHelp();
            process.exit(0);
          default:
            /* eslint-disable-next-line no-console */
            console.error(`Error: Unrecognized flag: ${arg}`);
            process.exit(1);
        }
      } else {
        switch (arg.substring(1).trim()) {
          case "v":
            /* eslint-disable-next-line no-console */
            console.log(`v${currentReadmeVersion}`);
            process.exit(0);
          case "i":
            currentFlag = "input";
            break;
          case "o":
            currentFlag = "output";
            break;
          case "p":
            currentFlag = "project-version";
            break;
          case "c":
            shouldClean = true;
            break;
          case "h":
            displayHelp();
            process.exit(0);
          default:
            /* eslint-disable-next-line no-console */
            console.error(`Error: Unrecognized flag: ${arg}`);
            process.exit(1);
        }
      }
    } else if (currentFlag !== undefined) {
      switch (currentFlag) {
        case "input":
          inDir = arg;
          break;
        case "output":
          outDir = arg;
          break;
        case "project-version":
          version = arg;
          break;
      }
      currentFlag = undefined;
    } else {
      /* eslint-disable-next-line no-console */
      console.error(`Error: unexpected token in command: ${arg}`);
      process.exit(1);
    }
  }

  if (inDir === undefined || outDir === undefined) {
    /* eslint-disable-next-line no-console */
    console.error(
      "Error: The documentation generator needs at least " +
        "the input directory (behind an `-i` flag) and the output directory" +
        " (behind an `-o` flag) but at least one of them was missing.",
    );
    process.exit(1);
  }

  return {
    baseInDir: inDir,
    baseOutDir: outDir,
    options: {
      version,
      clean: shouldClean,
    },
  };
}

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable no-console */
  console.log(
    /* eslint-disable indent */
    `Usage: node readme.doc [options]
Options:
  -h, --help               Display this help
  -v, --version            Display the current version of README
  -i, --input              [Mandatory] Root directory where your documentation source files are.
  -o, --output             [Mandatory] Destination directory where your HTML documentation will be created.
  -c, --clean              [Optional, Recommended] Remove output directory if it already exists
  -p, --project-version    [Optional, Recommended] Indicate your current project's version`,
    /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
