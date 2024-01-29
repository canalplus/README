import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { load } from "cheerio";
import type { AnyNode, Cheerio } from "cheerio";
import convertMDToHTML from "./convert_MD_to_HMTL.js";
import generatePageHtml from "./generate_page_html.js";
import type { FileSearchIndex } from "./get_search_data_for_content.js";
import getSearchDataForContent from "./get_search_data_for_content.js";
import log from "./log.js";
import { mkdirParent, toUriCompatibleRelativePath } from "./utils.js";

/**
 * All characters stripped from an "anchor" in the form of a negated set
 * ([^...]), meaning that everything that is listed here is what is authrized.
 *
 * Also note that spaces are replaced by dashes.
 *
 * We may want to authorize everything that can be added to an URL fragment,
 * but we also want very simple rules predicitible for the user and mostly
 * compatible to other markdown viewers (GitHub, GitLab...), so we
 * basically only authorize lowercase alphanumeric characters, dashes and
 * underscores.
 */
const BLACKLIST_ANCHOR = /[^a-z0-9_-]/g;

/** Input data required to produce a single documentation page. */
export interface DocumentationPageSettings {
  /** Absolute path to the root dir where all outputed files will be */
  baseOutDir: string;
  /** Relative CSS URLs on this page */
  cssUrls: string[];
  /** Eventual URL to the favicon */
  faviconUrl: string | null;
  /** Absolute path to the file that should be converted */
  inputFile: string;
  /** Function translating links in Markdown files to an URL form to the right file */
  linkTranslator: (link: string) => string | undefined;
  /** HTML string for the navbar (the header on the top of the page) */
  navBarHtml: string;
  /** Information relative to the next documentation page, `null` if none. */
  nextPageInfo: {
    /** Relative URL linking to it. */
    link: string;
    /** Display Name for the page. */
    name: string;
  } | null;
  /** Absolute path where the generated page should be generated. */
  outputFile: string;
  /** HTML string for the complete list of documentation pages with links */
  pageListHtml: string;
  /** Title of the corresponding HTML page */
  pageTitle: string;
  /** Information relative to the previous documentation page, `null` if none. */
  prevPageInfo: {
    /** Relative URL linking to it. */
    link: string;
    /** Display Name for the page. */
    name: string;
  } | null;
  /** Relative JS URLs on this page */
  scriptUrls: string[];
  /**
   * Array corresponding to the complete search index.
   * It will be completed with data present in this file.
   */
  searchIndex: Array<{
    file: string;
    index: FileSearchIndex[];
  }>;
  /** HTML string for the sidebar */
  sidebarHtml: string;
}

interface DocumentationPageMetadata {
  /** All "anchors" present in the generated page. */
  anchors: string[];
}

/**
 * Create and write HTML page output file from the markdown input file.
 * @param {Object} options
 * @returns {Promise}
 */
export default async function createDocumentationPage({
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
}: DocumentationPageSettings): Promise<DocumentationPageMetadata> {
  const rootUrl = toUriCompatibleRelativePath(
    path.resolve(baseOutDir),
    path.dirname(outputFile)
  );
  const outputUrlFromRoot = toUriCompatibleRelativePath(outputFile, baseOutDir);

  const outputDir = path.dirname(outputFile);
  let data;
  try {
    data = await promisify(fs.readFile)(inputFile, "utf8");
  } catch (err) {
    const errorStr = err instanceof Error ? String(err) : "Unknown Error";
    log("WARNING", "error reading file: " + errorStr);
    return { anchors: [] };
  }
  const inputDir = path.dirname(inputFile);
  const {
    anchors,
    html: resHtml,
    tocMd,
    nbTocElements,
  } = await parseMD(data, inputDir, outputDir, baseOutDir, linkTranslator);
  const searchData = getSearchDataForContent(resHtml);
  searchIndex.push({
    file: outputUrlFromRoot,
    index: searchData,
  });
  const contentHtml =
    resHtml + constructNextPreviousPage(prevPageInfo, nextPageInfo);

  const tocHtml = nbTocElements > 1 ? constructTocBarHtml(tocMd) : "";
  const html = generatePageHtml({
    contentHtml,
    cssUrls,
    faviconUrl,
    navBarHtml,
    pageListHtml,
    rootUrl,
    scriptUrls,
    sidebarHtml,
    title: pageTitle,
    tocHtml,
  });

  try {
    await promisify(fs.writeFile)(outputFile, html);
  } catch (err) {
    const errorStr = err instanceof Error ? String(err) : "Unknown Error";
    log("WARNING", "Error writing file: " + errorStr);
    return { anchors: [] };
  }
  return { anchors };
}

/**
 * Check that a media asset referenced in a media Element is valid (e.g. it
 * exists and is inside the root directory and copy it into the output directory
 * if so.
 * @param {Object} mediaTag
 * @param {string} inputDir - The directory where the current input file where
 * that media tag was found is.
 * @param {string} outputDir - The directory where the wanted corresponding
 * generated documentation file will be.
 * @param {string} baseOutDir - The root output directory where all output files
 * will be copied.
 * @returns {Promise} - Promise which resolves on success and reject if things
 * get wrong.
 */
async function checkAndCopyMediaAsset(
  mediaTag: Cheerio<AnyNode>,
  inputDir: string,
  outputDir: string,
  baseOutDir: string
): Promise<void> {
  const src = mediaTag.attr("src");
  if (src === null || src === undefined || src === "") {
    return;
  }

  // TODO more protocols
  if (/^https?:\/\//g.test(src)) {
    return;
  }

  const inputFile = path.join(inputDir, src);
  const outputFile = path.join(outputDir, src);
  const outDir = path.dirname(outputFile);

  const relativeDir = path.relative(baseOutDir, outDir);
  const isSubdir = !relativeDir.startsWith("..");
  if (!isSubdir) {
    throw new Error(
      "You're trying to copy a media asset outside of your root directory (" +
        src +
        "). This is for forbidden for now."
    );
  }

  // TODO check if already done in the current invokation

  const doesOutDirExists = await promisify(fs.exists)(outDir);
  if (!doesOutDirExists) {
    try {
      await mkdirParent(outDir);
    } catch (err) {
      const srcMessage =
        ((err as { message: string }) ?? {}).message ?? "Unknown error";
      throw new Error(`Could not create "${outDir}" directory: ${srcMessage}`);
    }
  }
  await promisify(fs.copyFile)(inputFile, outputFile);
}

/**
 * Construct the next and previous page nav Element.
 * @param {Object|null} prevPageInfo
 * @param {Object|null} nextPageInfo
 * @returns {string}
 */
function constructNextPreviousPage(
  prevPageInfo: {
    link: string;
    name: string;
  } | null,
  nextPageInfo: {
    link: string;
    name: string;
  } | null
): string {
  if (prevPageInfo === null && nextPageInfo === null) {
    return "";
  }

  const prevPageElt = createNextPrevElt(prevPageInfo, false);
  const nextPageElt = createNextPrevElt(nextPageInfo, true);
  return (
    `<nav class="next-previous-page-wrapper" aria-label="Navigate between pages">` +
    prevPageElt +
    nextPageElt +
    `</nav>`
  );

  function createNextPrevElt(
    pageInfo: {
      link: string;
      name: string;
    } | null,
    isNext: boolean
  ): string {
    const base = `<div class="next-or-previous-page${
      isNext ? " next-page" : ""
    }">`;
    if (pageInfo === null) {
      return base + "</div>";
    }
    return (
      base +
      `<a class="next-or-previous-page-link" href="${pageInfo.link}">` +
      `<div class="next-or-previous-page-link-label">` +
      (isNext ? "Next" : "Previous") +
      "</div>" +
      `<div class="next-or-previous-page-link-name">${pageInfo.name}</div>` +
      "</a></div>"
    );
  }
}

/**
 * Convert Markdown to HTML.
 * @param {string} data - Markdown to convert
 * @param {string} inputDir - Directory the Markdown file is in.
 * Can be used to copy image/video/audio files.
 * @param {string} outputDir - Directory the HTML file will be in.
 * Can be used to copy image/video/audio files.
 * @param {Function|null|undefined} linkTranslator - Allow to translate links
 * from markdown to HTML. Is given the orginal link in the markdown and should
 * return the converted link.
 * If null or undefined, the links won't be converted.
 * @returns {Promise.<string>}
 */
async function parseMD(
  data: string,
  inputDir: string,
  outputDir: string,
  baseOutDir: string,
  linkTranslator: ((link: string) => string | undefined) | null | undefined
): Promise<{
  /** HTML output */
  html: string;
  /** Table of contents in a Markdown list format. */
  tocMd: string;
  /** Number of elements in the table of content. */
  nbTocElements: number;
  /** All anchors generated in that content. */
  anchors: string[];
}> {
  const $ = load(convertMDToHTML(data));
  const generatedAnchors: Partial<Record<string, true>> = {};
  const tocLines: string[] = [];
  const anchors: string[] = [];

  // Go through link translator for every links originally in the file
  if (linkTranslator) {
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (typeof href === "string") {
        $(elem).attr("href", linkTranslator(href));
      }
    });
  }

  // Copy linked image, audio and video assets into output directory

  const imgTags = $("img").toArray();
  for (let i = 0; i < imgTags.length; i++) {
    await checkAndCopyMediaAsset(
      $(imgTags[i]),
      inputDir,
      outputDir,
      baseOutDir
    );
  }
  const audioTags = $("audio").toArray();
  for (let i = 0; i < audioTags.length; i++) {
    await checkAndCopyMediaAsset(
      $(audioTags[i]),
      inputDir,
      outputDir,
      baseOutDir
    );
  }
  const videoTags = $("video").toArray();
  for (let i = 0; i < videoTags.length; i++) {
    await checkAndCopyMediaAsset(
      $(videoTags[i]),
      inputDir,
      outputDir,
      baseOutDir
    );
  }

  // Generate headers anchor links, just before headers are declared.

  const hLinks = $("h1, h2, h3").toArray();
  for (let i = 0; i < hLinks.length; i++) {
    const linkElt = hLinks[i];
    const linkText = $(linkElt).text();
    const uri = generateAnchorName(linkText);
    const tagName = hLinks[i].tagName.toLowerCase();
    let prefix;
    if (tagName === "h1") {
      prefix = "";
    } else if (tagName === "h2") {
      prefix = "  - ";
    } else {
      prefix = "    - ";
    }
    anchors.push(uri);
    tocLines.push(`${prefix}[${linkText}](#${uri})`);
    $(`<a name="${uri}"></a>`).insertBefore(linkElt);
  }

  return {
    html: $.html(),
    tocMd: tocLines.join("\n"),
    nbTocElements: tocLines.length,
    anchors,
  };

  function generateAnchorName(title: string): string {
    const baseUri = encodeURI(
      title
        .trim()
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(BLACKLIST_ANCHOR, "")
    );
    if (generatedAnchors[baseUri] !== true) {
      generatedAnchors[baseUri] = true;
      return baseUri;
    }
    let i = 1;
    let resultUri;
    do {
      resultUri = `${baseUri}_(${i})`;
      i++;
    } while (generatedAnchors[resultUri] === true);
    generatedAnchors[resultUri] = true;
    return resultUri;
  }
}

/**
 * Construct the table of contents part of the HTML page, containing various
 * links to the current documentation page.
 * @param {string} tocMd - Markdown for the table of contents under a list form.
 * @returns {string} - sidebar div tag
 */
function constructTocBarHtml(tocMd: string): string {
  const tocHtml = convertMDToHTML(tocMd);
  return (
    '<div class="tocbar-wrapper">' +
    '<div class="tocbar">' +
    tocHtml +
    "</div>" +
    "</div>"
  );
}
