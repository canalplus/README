import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { rimrafSync } from "rimraf";
import AnchorChecker, { AnchorValidity } from "./anchor_checker.js";
import createDocumentationPage from "./create_documentation_page.js";
import generateHeaderHtml from "./generate_header_html.js";
import generatePageListHtml from "./generate_page_list_html.js";
import generateSidebarHtml from "./generate_sidebar_html.js";
import type { FileSearchIndex } from "./get_search_data_for_content.js";
import log from "./log.js";
import parseDocConfigs from "./parse_doc_configs.js";
import type {
  LogoInformation,
  LocalDocPageInformation,
  LinkCategory,
} from "./parse_doc_configs.js";
import { SiteMapCreator } from "./site_map_creator.js";
import { mkdirParent, toUriCompatibleRelativePath } from "./utils.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

/** Global JS configuration for README. */
export interface DocumentationCreationOptions {
  /** If `true`, we will remove the output directory first. */
  clean?: boolean;
  /** Set to the project's version linked to your documentation. */
  version?: string | undefined;
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

  // Parse global configuration as well as local configurations
  const config = await parseDocConfigs(baseInDir, baseOutDir);

  // Copy global files to output directory
  const cssOutputPaths: string[] = await copyCssFiles(baseOutDir);
  const scriptOutputPaths: string[] = await copyJavaScriptFiles(baseOutDir);
  if (typeof config.favicon?.srcPath === "string") {
    await copyFileToOutputDir(config.favicon.srcPath, baseInDir, baseOutDir);
  }
  if (typeof config.logo?.srcPath === "string") {
    await copyFileToOutputDir(config.logo.srcPath, baseInDir, baseOutDir);
  }

  /**
   * Will be used to check the validity of anchor links between documentation
   * pages (and relative to the same page).
   */
  const anchorChecker = new AnchorChecker();

  /**
   * Will be used to generate the site map file for search engine.
   */
  const siteMapCreator = new SiteMapCreator();
  /**
   * Map where the key is the input Markdown file and the value the
   * corresponding output HTML file.
   */
  const fileMap: Map<string, string> = constructFileMap(config.links);

  /** Object filled progressively to construct our final search index. */
  const searchIndex: Array<{
    file: string;
    index: FileSearchIndex[];
  }> = [];

  const version: string | undefined = options.version;

  // Create documentation pages
  for (
    let linkIndexInConfig = 0;
    linkIndexInConfig < config.links.length;
    linkIndexInConfig++
  ) {
    const currentLink = config.links[linkIndexInConfig];
    if (currentLink.type !== "local-doc") {
      continue;
    }
    for (let pageIdx = 0; pageIdx < currentLink.pages.length; pageIdx++) {
      const currentPage = currentLink.pages[pageIdx];
      if (!currentPage.isPageGroup) {
        const { inputFile, outputFile } = currentPage;
        await prepareAndCreateDocumentationPage({
          inputFile,
          outputFile,
          linkIndexInConfig,
          pageIndexesInLink: [pageIdx],
          pageTitle: currentPage.displayName,
        });
      } else if (Array.isArray(currentPage.pages)) {
        for (
          let subPageIdx = 0;
          subPageIdx < currentPage.pages.length;
          subPageIdx++
        ) {
          const currentSubPage = currentPage.pages[subPageIdx];
          const { inputFile, outputFile } = currentSubPage;
          await prepareAndCreateDocumentationPage({
            inputFile,
            outputFile,
            linkIndexInConfig,
            pageIndexesInLink: [pageIdx, subPageIdx],
            pageTitle: currentSubPage.displayName,
          });
        }
      }
    }
  }

  const anchorCheckErrors = anchorChecker.checkAllAnchors();
  if (anchorCheckErrors.length > 0) {
    for (const check of anchorCheckErrors) {
      if (check.validity === AnchorValidity.AnchorNotFound) {
        let message = `A referenced anchor link was not found.
  File with link: ${check.inputFileWithLink}
  Linked file:    ${check.inputFileLinkDestination}
  Anchor:         ${check.anchor}
`;
        const availableAnchors = anchorChecker.getAnchorsForInputFile(
          check.inputFileLinkDestination,
        );
        if (availableAnchors !== undefined && availableAnchors.length > 0) {
          message +=
            "  Available Anchors: " + availableAnchors.join(", ") + "\n";
        }
        log("WARNING", message);
      }
    }
  }

  if (config.siteMapRoot !== undefined) {
    const xml = siteMapCreator.generateSiteMapXML();
    try {
      const sitemapLoc = path.join(path.resolve(baseOutDir), "sitemap.xml");
      await promisify(fs.writeFile)(sitemapLoc, xml);
    } catch (err) {
      const srcMessage =
        ((err as { message: string }) ?? {}).message ?? "Unknown error";
      log("WARNING", `Could not create sitemap file: ${srcMessage}`);
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
    log("WARNING", `Could not create search index file: ${srcMessage}`);
  }

  return;

  async function prepareAndCreateDocumentationPage({
    inputFile,
    outputFile,
    linkIndexInConfig,
    pageIndexesInLink,
    pageTitle,
  }: {
    inputFile: string;
    outputFile: string;
    linkIndexInConfig: number;
    pageIndexesInLink: number[];
    pageTitle: string;
  }) {
    const link = config.links[linkIndexInConfig];
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
      if (
        config.logo !== undefined &&
        typeof config.logo.srcPath === "string"
      ) {
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
      linkIndexInConfig,
      pageIndexesInLink,
      outputFile,
    );
    const navBarHtml = generateHeaderHtml(
      config,
      linkIndexInConfig,
      outputFile,
      logoInfo,
      version,
    );
    const pages = link.pages;
    const sidebarHtml = generateSidebarHtml(
      pages,
      pageIndexesInLink,
      outputFile,
      logoInfo,
    );

    const firstLevelPage = pages[pageIndexesInLink[0]];
    let prevPageConfig: LocalDocPageInformation | null = null;
    let nextPageConfig: LocalDocPageInformation | null = null;
    if (
      firstLevelPage.isPageGroup &&
      pageIndexesInLink.length > 1 &&
      pageIndexesInLink[1] > 0
    ) {
      prevPageConfig = firstLevelPage.pages[pageIndexesInLink[1] - 1] ?? null;
    } else if (pageIndexesInLink[0] > 0) {
      const prevFirstLevelPage = pages[pageIndexesInLink[0] - 1];
      if (prevFirstLevelPage !== undefined) {
        prevPageConfig = prevFirstLevelPage.isPageGroup
          ? prevFirstLevelPage.pages[0]
          : prevFirstLevelPage;
      }
    }
    if (
      firstLevelPage.isPageGroup &&
      pageIndexesInLink.length > 1 &&
      pageIndexesInLink[1] < firstLevelPage.pages.length - 1
    ) {
      nextPageConfig = firstLevelPage.pages[pageIndexesInLink[1] + 1];
    } else if (pageIndexesInLink[0] < pages.length - 1) {
      const nextFirstLevelPage = pages[pageIndexesInLink[0] + 1];
      if (nextFirstLevelPage !== undefined) {
        nextPageConfig = nextFirstLevelPage.isPageGroup
          ? nextFirstLevelPage.pages[0]
          : nextFirstLevelPage;
      }
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
    const linkTranslator = linkTranslatorFactory(
      inputFile,
      outputFile,
      fileMap,
      anchorChecker,
    );
    const { anchors } = await createDocumentationPage({
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
    anchorChecker.addAnchorsForFile(inputFile, anchors);

    const outputUrlFromRoot = toUriCompatibleRelativePath(
      outputFile,
      baseOutDir,
    );
    const root = config.siteMapRoot;
    if (config.siteMapRoot !== undefined) {
      try {
        // it is recommended that sitemap should only use absolute URL
        const absoluteURL = new URL(outputUrlFromRoot, root).href;
        siteMapCreator.addToSiteMap(absoluteURL);
      } catch (err) {
        const srcMessage =
          ((err as { message: string }) ?? {}).message ?? "Unknown error";
        throw new Error(
          `Could not create siteMap url "${outputUrlFromRoot}", the root ${root} may be incorrect : ${srcMessage}`,
        );
      }
    }
  }
}

/**
 * Generate linkTranslator functions
 * @param {string} inputFile
 * @param {string} outputFile
 * @param {Array.<Object>} fileMap
 * @param {Object} anchorChecker
 * @returns {Function}
 */
function linkTranslatorFactory(
  inputFile: string,
  outputFile: string,
  fileMap: Map<string, string>,
  anchorChecker: AnchorChecker,
): (link: string) => string | undefined {
  const outputDir = path.dirname(outputFile);
  /**
   * Convert links to files that will be converted to the links of the
   * corresponding converted output files.
   * @param {string} link
   * @returns {string|undefined}
   */
  return (link: string): string | undefined => {
    if (/^(?:[a-z]+:\/\/)/.test(link)) {
      return;
    }
    if (link[0] === "#") {
      anchorChecker.addAnchorReference(inputFile, inputFile, link.substring(1));
      return;
    }
    const extname = path.extname(link);
    const indexOfAnchor = extname.indexOf("#");

    const anchor = indexOfAnchor > 0 ? extname.substring(indexOfAnchor) : "";

    const linkWithoutAnchor = link.substring(0, link.length - anchor.length);
    const completeLink = path.join(path.dirname(inputFile), linkWithoutAnchor);
    const normalizedLink = path.normalize(path.resolve(completeLink));

    const translation = fileMap.get(normalizedLink);
    if (translation === undefined) {
      log(
        "WARNING",
        `A referenced link was not found.
  File: ${inputFile}
  Link: ${link}
`,
      );
    } else if (anchor.length > 1) {
      anchorChecker.addAnchorReference(
        inputFile,
        normalizedLink,
        anchor.substring(1),
      );
    }
    return translation !== undefined
      ? toUriCompatibleRelativePath(translation, outputDir) + anchor
      : undefined;
  };
}

function getRelativePageInfo(
  pageConfig: LocalDocPageInformation,
  currentPath: string,
): {
  name: string;
  link: string;
} | null {
  const { displayName: pDisplayName, outputFile: pOutputFile } = pageConfig;
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

  const relativeDir = path.relative(inputDir, inputPath);
  const isSubdir = !relativeDir.startsWith("..");
  if (!isSubdir) {
    throw new Error(
      "You're trying to copy a media asset outside of your root directory (" +
        filePathFromInputDir +
        "). This is for forbidden for now.",
    );
  }
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

async function copyCssFiles(baseOutDir: string): Promise<string[]> {
  const cssOutputDir = path.join(path.resolve(baseOutDir), "styles");
  const cssFiles = [
    path.join(currentDir, "styles/style.css"),
    path.join(currentDir, "styles/code.css"),
  ];
  const outputPaths = cssFiles.map((cssFilepath: string) => {
    return path.join(cssOutputDir, path.basename(cssFilepath));
  });
  await createDirIfDoesntExist(cssOutputDir);
  await Promise.all(
    cssFiles.map(async (cssInput: string, i: number) => {
      await promisify(fs.copyFile)(cssInput, outputPaths[i]);
    }),
  );
  return outputPaths;
}

async function copyJavaScriptFiles(baseOutDir: string): Promise<string[]> {
  const scriptOutputDir = path.join(path.resolve(baseOutDir), "scripts");
  const scripts = [
    path.join(currentDir, "scripts/fuse.js"),
    path.join(currentDir, "scripts/script.js"),
  ];
  const outputPaths = scripts.map((s) =>
    path.join(scriptOutputDir, path.basename(s)),
  );

  await createDirIfDoesntExist(scriptOutputDir);
  await Promise.all(
    scripts.map(async (s, i) => {
      await promisify(fs.copyFile)(s, outputPaths[i]);
    }),
  );
  return outputPaths;
}

/**
 * Construct a Map of markdown files path to the corresponding output file path.
 * This can be useful to redirect links to other converted markdowns.
 * @param {Array.<Object>} links
 * @returns {Map.<string, string>}
 */
function constructFileMap(links: LinkCategory[]): Map<string, string> {
  const fileMap = new Map<string, string>();
  for (const link of links) {
    if (link.type === "local-doc") {
      for (const pageInfo of link.pages) {
        if (pageInfo.isPageGroup) {
          for (const subPageInfo of pageInfo.pages) {
            fileMap.set(subPageInfo.inputFile, subPageInfo.outputFile);
          }
        } else {
          fileMap.set(pageInfo.inputFile, pageInfo.outputFile);
        }
      }
    }
  }
  return fileMap;
}
