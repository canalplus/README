import * as path from "path";
import { encode } from "html-entities";
import type { LogoInformation, ParsedDocConfig } from "./parse_doc_configs.js";
import { toUriCompatibleRelativePath, getGithubSvg } from "./utils.js";

/**
 * Construct HTML element, as a string, which corresponds to the header for
 * the chosen documentation page.
 * @param {Object} config
 * @param {number} currentLinkIdx
 * @param {string} currentPath
 * @param {object} logoInfo
 * @returns {string}
 */
export default function generateHeaderHtml(
  config: ParsedDocConfig,
  currentLinkIdx: number,
  currentPath: string,
  logoInfo: LogoInformation | null,
  version: string | undefined,
): string {
  const { links, linksRightIndex } = config;
  const hamburgerHtml = constructHamburgerMenuHtmlInHeaderBar();
  const logoHtml = constructLogoHtmlInHeaderBar(logoInfo);
  const currentDir = path.dirname(currentPath);

  const linksHtml = links
    .map((l, i) => {
      let customClass = "";
      if (i === linksRightIndex) {
        customClass = " first-right";
      } else if (i === linksRightIndex - 1) {
        customClass = " last-left";
      }
      switch (l.type) {
        case "local-doc": {
          if (l.firstPage === undefined) {
            return "";
          }
          const relativeUri = toUriCompatibleRelativePath(
            l.firstPage,
            currentDir,
          );
          const activeClass = i === currentLinkIdx ? " navbar-active" : "";
          const cleanedHref = encode(relativeUri);
          return (
            `<a class="navbar-item${activeClass}${customClass} hideable"` +
            `href="${cleanedHref}">${encode(l.displayName)}</a>`
          );
        }
        case "external-link": {
          const cleanedHref = encode(l.link);
          return (
            `<a class="navbar-item${customClass} hideable"` +
            `href="${cleanedHref}">${encode(l.displayName)}</a>`
          );
        }
        case "github-link":
          return constructGithubLinkHtmlInHeaderBar(l.link, customClass);
        case "search":
          return constructSearchHtmlInHeaderBar(customClass);
        case "version":
          return constructVersionLinkHtmlInHeaderBar(
            version,
            l.link ?? null,
            customClass,
          );
      }
    })
    .join("\n");
  return (
    `<nav class="navbar-parent">` +
    `<div class="navbar-wrapper">` +
    `<div class="navbar-items">` +
    hamburgerHtml +
    logoHtml +
    linksHtml +
    "</div></div> </nav>"
  );
}

function constructHamburgerMenuHtmlInHeaderBar(): string {
  return (
    `<button aria-label="Open website index" class="hamburger-opener">` +
    `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">` +
    `<path stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" ` +
    `stroke-width="2" d="M4 7h22M4 15h22M4 23h22"></path></svg>` +
    "</button>"
  );
}

/**
 * Returns the HTML string corresponding to the current version number, if
 * available, and with the corresponding link, also if available.
 * @param {string|undefined} version
 * @param {string|undefined} link
 * @param {string} customClass
 * @returns {string}
 */
function constructVersionLinkHtmlInHeaderBar(
  version: string | undefined,
  link: string | null,
  customClass: string,
): string {
  if (typeof version !== "string") {
    return "";
  }
  let element = "";
  let hasLink = false;
  if (typeof link === "string") {
    hasLink = true;
    element +=
      `<a class="navbar-item${customClass}"` + `href="${encode(link)}">`;
  } else {
    element += `<span class="navbar-item${customClass}">`;
  }
  element += `<span class="version-item">version: ${encode(version)}</span>`;
  element += hasLink ? "</a>" : "</span>";
  return element;
}

/**
 * Returns the HTML string corresponding to the link to the github repository,
 * through a SVG representing Github's logo.
 * @param {string} githubLnk
 * @param {string} customClass
 * @returns {string}
 */
function constructGithubLinkHtmlInHeaderBar(
  githubLnk: string,
  customClass: string,
): string {
  const cleanedHref = encode(githubLnk);
  return (
    `<a aria-label="Link to repository" class="navbar-item${customClass} github-link hideable" href="${cleanedHref}">` +
    getGithubSvg() +
    "</a>"
  );
}

function constructSearchHtmlInHeaderBar(customClass: string): string {
  return (
    `<span class="navbar-item search-icon${customClass}">` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" ` +
    `viewBox="0 0 20 20">` +
    `<title>search</title>` +
    `<path d="M19 17l-5.15-5.15a7 7 0 1 0-2 2L17 19zM3.5 8A4.5 4.5 ` +
    `0 1 1 8 12.5 4.5 4.5 0 0 1 3.5 8z"/>` +
    `<script xmlns=""/></svg>` +
    `</span>`
  );
}

/**
 * Returns the HTML string corresponding to the logo of the current project, if
 * available, and with the corresponding link, also if available.
 * @param {Object|undefined} logoInfo
 * @returns {string}
 */
function constructLogoHtmlInHeaderBar(
  logoInfo: LogoInformation | undefined | null,
): string {
  if (logoInfo === null || logoInfo === undefined) {
    return "";
  }

  let logoHtml = "";
  let hasLink = false;
  if (typeof logoInfo.link === "string") {
    hasLink = true;
    logoHtml += `<a class="logo-link" href="${encode(logoInfo.link)}">`;
  }
  if (typeof logoInfo.url === "string") {
    logoHtml +=
      `<img alt="Logo" class="navbar-item navbar-item-logo"` +
      ` src="${encode(logoInfo.url)}" />`;
  }
  if (hasLink) {
    logoHtml += "</a>";
  }
  return logoHtml;
}
