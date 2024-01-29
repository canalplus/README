import * as path from "path";
import { encode } from "html-entities";
import type { LinkCategory } from "./parse_doc_configs.js";
import { getGithubSvg, toUriCompatibleRelativePath } from "./utils.js";

/**
 * Construct exhaustive list of documentation links as an HTML string.
 * @param {Array.<Object>} links
 * @param {number} currentLinkIdx
 * @param {Array.<number>} currentPageIndexes
 * @param {string} currentPath
 * @returns {string}
 */
export default function generatePageListHtml(
  links: LinkCategory[],
  currentLinkIdx: number,
  currentPageIndexes: number[],
  currentPath: string,
): string {
  const currentDir = path.dirname(currentPath);
  const linksHtml = links
    .map((l, linkIdx) => {
      switch (l.type) {
        case "local-doc": {
          const isActiveCat = linkIdx === currentLinkIdx;
          const catActiveClasses = isActiveCat ? " opened active" : "";

          const catHtml =
            `<li class="page-list-item">` +
            `<div class="page-list-group${catActiveClasses}">` +
            encode(l.displayName) +
            `</div><ul class="page-list-cat-group">`;

          return (
            catHtml +
            l.pages
              .map((currentPage, pageidx) => {
                const isPageActive =
                  isActiveCat && pageidx === currentPageIndexes[0];
                const { displayName, outputFile } = currentPage;
                if (!currentPage.isPageGroup) {
                  if (outputFile === undefined) {
                    return "";
                  }
                  const pageActiveClasses = isPageActive ? " active" : "";
                  const relativeUri = toUriCompatibleRelativePath(
                    outputFile,
                    currentDir,
                  );
                  return (
                    `<li class="page-list-item${pageActiveClasses}">` +
                    `<a href="${encode(relativeUri)}">` +
                    encode(displayName) +
                    `</a></li>`
                  );
                }
                const pageActiveClasses =
                  (isPageActive ? " active" : "") +
                  (isPageActive || currentPage.defaultOpen === true
                    ? " opened"
                    : "");
                const pageGroupHtml =
                  `<li>` +
                  `<div class="page-list-item page-list-group${pageActiveClasses}">` +
                  encode(displayName) +
                  `</div><ul class="page-list-group-group">`;
                return (
                  pageGroupHtml +
                  (currentPage.pages ?? [])
                    .map((currentSubPage, spIdx) => {
                      const spActiveClasses =
                        isPageActive && spIdx === currentPageIndexes[1]
                          ? " active"
                          : "";
                      const {
                        displayName: subDisplayName,
                        outputFile: subOutputFile,
                      } = currentSubPage;
                      if (subOutputFile === undefined) {
                        return "";
                      }
                      const relativeUri = toUriCompatibleRelativePath(
                        subOutputFile,
                        currentDir,
                      );
                      return (
                        `<li class="page-list-item${spActiveClasses}">` +
                        `<a href="${encode(relativeUri)}">` +
                        encode(subDisplayName) +
                        `</a></li>`
                      );
                    })
                    .join("\n") +
                  "</ul></li>"
                );
              })
              .join("\n") +
            "</ul></li>"
          );
        }

        case "external-link": {
          const cleanedHref = encode(l.link);
          return (
            `<li class="page-list-item">` +
            `<a href="${cleanedHref}">` +
            encode(l.displayName) +
            "</a></li>"
          );
        }

        case "github-link":
          const cleanedHref = encode(l.link);
          return (
            `<li class="page-list-item">` +
            `<a aria-label="Link to repository" href="${cleanedHref}">` +
            getGithubSvg() +
            "</a></li>"
          );

        case "search":
          return "";

        case "version":
          // TODO?
          return "";
      }
    })
    .join("\n");

  return `<ul class="page-list-wrapper">` + linksHtml + "</ul>";
}
