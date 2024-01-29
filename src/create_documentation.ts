import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { rimrafSync } from "rimraf";
import createDocumentationPage from "./create_documentation_page.js";
import generateHeaderHtml from "./generate_header_html.js";
import generatePageListHtml from "./generate_page_list_html.js";
import generateSidebarHtml from "./generate_sidebar_html.js";
import type { FileSearchIndex } from "./get_search_data_for_content.js";
import parseDocConfigs from "./parse_doc_configs.js";
import type {
  ParsedDocConfig,
  LogoInformation,
  LocalDocInformation,
} from "./parse_doc_configs.js";
import { mkdirParent, toUriCompatibleRelativePath } from "./utils.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

async function createDirIfDoesntExist(dir: string) {
  const doesCSSOutDirExists = await promisify(fs.exists)(dir);
  if (!doesCSSOutDirExists) {
    try {
      await mkdirParent(dir);
    } catch (err) {
      const srcMessage =
        ((err as { message: string }) ?? {}).message ?? "Unknown error";
      throw new Error(`Could not create "${dir}" directory: ${srcMessage}`);
    }
  }
}

export interface DocumentationCreationOptions {
  clean?: boolean;
  css?: string[];
  version?: string | undefined;
  getPageTitle?: (mdTitle: string) => string;
}

/**
 * Create documentation for the directory given into the ouput directory given.
 * @param {string} baseInDir - The input directory where markdown documentation
 * is read.
 * @param {string} baseOutDir - The output directory where HTML files are
 * generated.
 * @param {Object} [options={}] - Various documentation options.
 * @param {Function} [options.getPageTitle] - Callback returning the name of the
 * page, based on the name of a single markdown document.
 * If not set, the page title will just be the corresponding markdown's title.
 * @param {Array.<string>} [options.css] - Optional CSS files which will be
 * linked to each generated page.
 * Should be the path to each of those.
 * @param {string|undefined} [options.version] - String indicating the current
 * version of the documented application.
 * @returns {Promise} - Resolve when done
 */
export default async function createDocumentation(
  baseInDir: string,
  baseOutDir: string,
  options: DocumentationCreationOptions = {},
): Promise<void> {
  if (options.clean === true) {
    rimrafSync(baseOutDir);
  }

  let cssOutputPaths: string[] = [];

  {
    const cssOutputDir = path.join(path.resolve(baseOutDir), "styles");
    const cssFiles = [
      path.join(currentDir, "styles/style.css"),
      path.join(currentDir, "styles/code.css"),
    ];
    if ("css" in options && Array.isArray(options.css)) {
      // Copy CSS files
      const { css } = options;
      cssFiles.push(...css.filter((p: unknown) => typeof p === "string"));
    }

    cssOutputPaths = cssFiles.map((cssFilepath: string) => {
      return path.join(cssOutputDir, path.basename(cssFilepath));
    });

    await createDirIfDoesntExist(cssOutputDir);
    await Promise.all(
      cssFiles.map(async (cssInput: string, i: number) => {
        await promisify(fs.copyFile)(cssInput, cssOutputPaths[i]);
      }),
    );
  }

  // Copy JavaScript file
  const scriptOutputDir = path.join(path.resolve(baseOutDir), "scripts");
  const scripts = [
    path.join(currentDir, "scripts/lunr.js"),
    path.join(currentDir, "scripts/script.js"),
  ];
  const scriptOutputPaths = scripts.map((s) =>
    path.join(scriptOutputDir, path.basename(s)),
  );

  await createDirIfDoesntExist(scriptOutputDir);
  await Promise.all(
    scripts.map(async (s, i) => {
      await promisify(fs.copyFile)(s, scriptOutputPaths[i]);
    }),
  );

  // Construct tree listing categories, pages, and relations between them.
  const config = await parseDocConfigs(baseInDir, baseOutDir);

  if (
    config.favicon !== undefined &&
    typeof config.favicon.srcPath === "string"
  ) {
    await copyFileToOutputDir(config.favicon.srcPath, baseInDir, baseOutDir);
  }
  if (config.logo !== undefined && typeof config.logo.srcPath === "string") {
    await copyFileToOutputDir(config.logo.srcPath, baseInDir, baseOutDir);
  }

  // Construct a dictionary of markdown files to the corresponding output file.
  // This can be useful to redirect links to other converted markdowns.
  const fileDict = config.links.reduce((acc, linkInfo) => {
    if (linkInfo.type !== "local-doc") {
      return acc;
    }
    return linkInfo.pages.reduce(
      (acc2: Partial<Record<string, string>>, pageInfo) => {
        if (pageInfo.isPageGroup) {
          return (pageInfo.pages ?? []).reduce(
            (acc3: Partial<Record<string, string>>, subPageInfo) => {
              if (subPageInfo.inputFile !== undefined) {
                acc3[subPageInfo.inputFile] = subPageInfo.outputFile;
              }
              return acc3;
            },
            acc2,
          );
        } else {
          if (pageInfo.inputFile !== undefined) {
            acc2[pageInfo.inputFile] = pageInfo.outputFile;
          }
        }
        return acc2;
      },
      acc,
    );
  }, {});

  const searchIndex: Array<{
    file: string;
    index: FileSearchIndex[];
  }> = [];

  // Create documentation pages
  for (let linkIdx = 0; linkIdx < config.links.length; linkIdx++) {
    const currentLink = config.links[linkIdx];
    if (currentLink.type !== "local-doc") {
      continue;
    }
    for (let pageIdx = 0; pageIdx < currentLink.pages.length; pageIdx++) {
      const currentPage = currentLink.pages[pageIdx];
      if (!currentPage.isPageGroup) {
        const { inputFile, outputFile } = currentPage;
        if (inputFile !== undefined && outputFile !== undefined) {
          await prepareAndCreateDocumentationPage({
            baseOutDir,
            config,
            cssOutputPaths,
            fileDict,
            inputFile,
            linkIdx,
            outputFile,
            pageIdxs: [pageIdx],
            pageTitle:
              options.getPageTitle === undefined
                ? currentPage.displayName
                : options.getPageTitle(currentPage.displayName),
            scriptOutputPaths,
            searchIndex,
            version: options.version,
          });
        }
      } else {
        if (Array.isArray(currentPage.pages)) {
          for (
            let subPageIdx = 0;
            subPageIdx < (currentPage.pages ?? []).length;
            subPageIdx++
          ) {
            const currentSubPage = currentPage.pages[subPageIdx];
            const { inputFile, outputFile } = currentSubPage;
            if (inputFile !== undefined && outputFile !== undefined) {
              await prepareAndCreateDocumentationPage({
                baseOutDir,
                config,
                cssOutputPaths,
                fileDict,
                inputFile,
                linkIdx,
                outputFile,
                pageIdxs: [pageIdx, subPageIdx],
                pageTitle:
                  options.getPageTitle === undefined
                    ? currentSubPage.displayName
                    : options.getPageTitle(currentSubPage.displayName),
                scriptOutputPaths,
                searchIndex,
                version: options.version,
              });
            }
          }
        }
      }
    }
  }

  try {
    const searchIndexLoc = path.join(
      path.resolve(baseOutDir),
      "searchIndex.json",
    );
    await promisify(fs.writeFile)(searchIndexLoc, JSON.stringify(searchIndex));
  } catch (err) {
    const srcMessage =
      ((err as { message: string }) ?? {}).message ?? "Unknown error";
    // eslint-disable-next-line no-console
    console.error(`Error: Could not create search index file: ${srcMessage}`);
  }
}

async function prepareAndCreateDocumentationPage({
  baseOutDir,
  config,
  cssOutputPaths,
  fileDict,
  inputFile,
  linkIdx,
  outputFile,
  pageIdxs,
  pageTitle,
  scriptOutputPaths,
  searchIndex,
  version,
}: {
  baseOutDir: string;
  config: ParsedDocConfig;
  cssOutputPaths: string[];
  fileDict: Partial<Record<string, string>>;
  inputFile: string;
  linkIdx: number;
  outputFile: string;
  pageIdxs: number[];
  pageTitle: string;
  scriptOutputPaths: string[];
  searchIndex: Array<{
    file: string;
    index: FileSearchIndex[];
  }>;
  version: string | undefined;
}) {
  const link = config.links[linkIdx];
  if (link.type !== "local-doc") {
    return;
  }
  // Create output directory if it does not exist
  const outDir = path.dirname(outputFile);
  await createDirIfDoesntExist(outDir);

  let logoInfo: LogoInformation | null = null;
  if (config.logo !== undefined) {
    logoInfo = {};
    if (config.logo !== undefined && typeof config.logo.link === "string") {
      logoInfo.link = config.logo.link;
    }
    if (config.logo !== undefined && typeof config.logo.srcPath === "string") {
      const fullPath = path.join(baseOutDir, config.logo.srcPath);
      logoInfo.url = toUriCompatibleRelativePath(fullPath, outDir);
    }
  }
  let faviconUrl = null;
  if (
    config.favicon !== undefined &&
    typeof config.favicon.srcPath === "string"
  ) {
    const fullPath = path.join(baseOutDir, config.favicon.srcPath);
    faviconUrl = toUriCompatibleRelativePath(fullPath, outDir);
  }
  const pageListHtml = generatePageListHtml(
    config.links,
    linkIdx,
    pageIdxs,
    outputFile,
  );
  const navBarHtml = generateHeaderHtml(
    config,
    linkIdx,
    outputFile,
    logoInfo,
    version,
  );
  const pages = link.pages ?? [];
  const sidebarHtml = generateSidebarHtml(
    pages,
    pageIdxs,
    outputFile,
    logoInfo,
  );

  let prevPageConfig = null;
  let nextPageConfig = null;
  if (pageIdxs.length > 1 && pageIdxs[1] > 0) {
    prevPageConfig = pages[pageIdxs[0]].pages?.[pageIdxs[1] - 1] ?? null;
  } else if (pageIdxs[0] > 0) {
    prevPageConfig = pages[pageIdxs[0] - 1] ?? null;
  }
  if (
    pageIdxs.length > 1 &&
    pageIdxs[1] < (pages[pageIdxs[0]].pages ?? []).length - 1
  ) {
    nextPageConfig = (pages[pageIdxs[0]].pages ?? [])[pageIdxs[1] + 1];
  } else if (pageIdxs[0] < pages.length - 1) {
    nextPageConfig = pages[pageIdxs[0] + 1];
  }
  const prevPageInfo =
    prevPageConfig === null
      ? null
      : getRelativePageInfo(prevPageConfig, outputFile);
  const nextPageInfo =
    nextPageConfig === null
      ? null
      : getRelativePageInfo(nextPageConfig, outputFile);

  const cssUrls = cssOutputPaths.map((cssOutput) =>
    toUriCompatibleRelativePath(cssOutput, outDir),
  );
  const scriptUrls = scriptOutputPaths.map((s) =>
    toUriCompatibleRelativePath(s, outDir),
  );

  // add link translation to options
  const linkTranslator = linkTranslatorFactory(inputFile, outDir, fileDict);
  await createDocumentationPage({
    baseOutDir,
    cssUrls,
    faviconUrl,
    inputFile,
    linkTranslator,
    navBarHtml,
    nextPageInfo,
    outputFile,
    pageListHtml,
    pageTitle,
    prevPageInfo,
    scriptUrls,
    searchIndex,
    sidebarHtml,
  });
}

/**
 * Generate linkTranslator functions
 * @param {string} inputFile
 * @param {string} outputDir
 * @param {Object} fileDict
 * @returns {Function}
 */
function linkTranslatorFactory(
  inputFile: string,
  outputDir: string,
  fileDict: Partial<Record<string, string>>,
): (link: string) => string | undefined {
  /**
   * Convert links to files that will be converted to the links of the
   * corresponding converted output files.
   * @param {string} link
   * @returns {string|undefined}
   */
  return (link: string): string | undefined => {
    if (/^(?:[a-z]+:)/.test(link) || link[0] === "#") {
      return;
    }
    const extname = path.extname(link);
    const indexOfAnchor = extname.indexOf("#");

    const anchor = indexOfAnchor > 0 ? extname.substring(indexOfAnchor) : "";

    const linkWithoutAnchor = link.substring(0, link.length - anchor.length);
    const completeLink = path.join(path.dirname(inputFile), linkWithoutAnchor);
    const normalizedLink = path.normalize(path.resolve(completeLink));

    const translation = fileDict[normalizedLink];
    if (translation === undefined) {
      // eslint-disable-next-line no-console
      console.warn(
        "WARNING: Local link not found.\n",
        "File:",
        inputFile,
        "\n",
        "Link:",
        link,
        "\n",
      );
    }
    return translation !== undefined
      ? toUriCompatibleRelativePath(translation, outputDir) + anchor
      : undefined;
  };
}

function getRelativePageInfo(
  pageConfig: LocalDocInformation,
  currentPath: string,
): {
  name: string;
  link: string;
} | null {
  const { displayName: pDisplayName, outputFile: pOutputFile } =
    Array.isArray(pageConfig.pages) && pageConfig.pages.length > 0
      ? pageConfig.pages[0]
      : pageConfig;

  if (pOutputFile === undefined) {
    return null;
  }
  const relativeHref = toUriCompatibleRelativePath(
    pOutputFile,
    path.dirname(currentPath),
  );
  return { name: pDisplayName, link: relativeHref };
}

async function copyFileToOutputDir(
  filePathFromInputDir: string,
  inputDir: string,
  outputDir: string,
) {
  const inputPath = path.join(inputDir, filePathFromInputDir);
  const outputPath = path.join(outputDir, filePathFromInputDir);
  const doesOutDirExists = await promisify(fs.exists)(path.dirname(outputPath));
  if (!doesOutDirExists) {
    try {
      await mkdirParent(path.dirname(outputPath));
    } catch (err) {
      const srcMessage =
        ((err as { message: string }) ?? {}).message ?? "Unknown error";
      throw new Error(
        `Could not create "${outputPath}" directory: ${srcMessage}`,
      );
    }
  }
  const doesOutFileExist = await promisify(fs.exists)(outputPath);
  if (!doesOutFileExist) {
    await promisify(fs.copyFile)(inputPath, outputPath);
  }
}
