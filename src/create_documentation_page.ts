import { promisify } from "util";
import { AnyNode, Cheerio, load } from "cheerio";
import * as fs from "fs";
import * as path from "path";
import getSearchDataForContent, {
  FileSearchIndex,
} from "./get_search_data_for_content.js";
import convertMDToHTML from "./convert_MD_to_HMTL.js";
import constructTableOfContents from "./construct_table_of_contents.js";
import generatePageHtml from "./generate_page_html.js";
import { mkdirParent, toUriCompatibleRelativePath } from "./utils.js";

/**
 * Create and write HTML page output file from the markdown input file.
 * @param {Object} options
 * @returns {Promise}
 */
export default async function createDocumentationPage({
  // Absolute path to the root dir where all outputed files will be
  baseOutDir,
  // Relative CSS URLs on this page
  cssUrls,
  // Eventual URL to the favicon
  faviconUrl,
  // Absolute path to the file that should be converted
  inputFile,
  // Function translating links in Markdown files to an URL form to the right file
  linkTranslator,
  // HTML string for the navbar (the header on the top of the page)
  navBarHtml,
  // Information relative to the next documentation page, `null` if none.
  nextPageInfo,
  // Absolute path where the generated page should be generated.
  outputFile,
  // HTML string for the complete list of documentation pages with links
  pageListHtml,
  // Title of the corresponding HTML page
  pageTitle,
  // Information relative to the previous documentation page, `null` if none.
  prevPageInfo,
  // Relative JS URLs on this page
  scriptUrls,
  // Array corresponding to the complete search index.
  // It will be completed with data present in this file.
  searchIndex,
  // HTML string for the sidebar
  sidebarHtml,
}: {
  baseOutDir: string;
  cssUrls: string[];
  faviconUrl: string | null;
  inputFile: string;
  linkTranslator: (link: string) => string | undefined;
  navBarHtml: string;
  nextPageInfo: {
    link: string;
    name: string;
  } | null;
  outputFile: string;
  pageListHtml: string;
  pageTitle: string;
  prevPageInfo: {
    link: string;
    name: string;
  } | null;
  scriptUrls: string[];
  searchIndex: Array<{
    file: string;
    index: FileSearchIndex[];
  }>;
  sidebarHtml: string;
}): Promise<void> {
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
    /* eslint-disable no-console */
    console.error("error reading file:", err);
    /* eslint-enable no-console */
    return;
  }
  const inputDir = path.dirname(inputFile);
  const { content, tocMd, nbTocElements } = constructTableOfContents(data);

  let contentHtml = await parseMD(content, inputDir, outputDir, linkTranslator);
  const searchData = getSearchDataForContent(contentHtml);
  searchIndex.push({
    file: outputUrlFromRoot,
    index: searchData,
  });
  contentHtml += constructNextPreviousPage(prevPageInfo, nextPageInfo);

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
    /* eslint-disable no-console */
    console.error("error writing file:", err);
    /* eslint-enable no-console */
    return;
  }
}

async function updateMediaTag(
  mediaTag: Cheerio<AnyNode>,
  inputDir: string,
  outputDir: string
): Promise<void> {
  const src = mediaTag.attr("src");
  if (!src) {
    return;
  }
  const inputFile = path.join(inputDir, src);
  const outputFile = path.join(outputDir, src);
  if (await promisify(fs.exists)(outputFile)) {
    return;
  }
  const outDir = path.dirname(outputFile);
  const doesOutDirExists = await promisify(fs.exists)(outDir);
  if (!doesOutDirExists) {
    try {
      await mkdirParent(outDir);
    } catch (err) {
      const srcMessage = ((err as any) ?? {}).message ?? "Unknown error";
      console.error(
        `Error: Could not create "${outDir}" directory: ${srcMessage}`
      );
      process.exit(1);
    }
  }
  await promisify(fs.copyFile)(inputFile, outputFile);
}

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
  linkTranslator: ((link: string) => string | undefined) | null | undefined
): Promise<string> {
  // TODO I don't understand Cheerio/Jquery here, that's plain ugly
  // use markdown-it plugin instead?
  const $ = load(convertMDToHTML(data));

  if (linkTranslator) {
    $("a").each((_, elem) => {
      const href = $(elem).attr("href");
      if (typeof href === "string") {
        $(elem).attr("href", linkTranslator(href));
      }
    });
  }

  const imgTags = $("img").toArray();
  for (let i = 0; i < imgTags.length; i++) {
    await updateMediaTag($(imgTags[i]), inputDir, outputDir);
  }
  const audioTags = $("audio").toArray();
  for (let i = 0; i < audioTags.length; i++) {
    await updateMediaTag($(audioTags[i]), inputDir, outputDir);
  }
  const videoTags = $("video").toArray();
  for (let i = 0; i < videoTags.length; i++) {
    await updateMediaTag($(videoTags[i]), inputDir, outputDir);
  }
  return $.html();
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
