import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

export interface VersionCategory {
  type: "version";
}

export interface ExternalLinkCategory {
  type: "external-link";
  link: string;
  displayName: string;
}

export interface GithubLinkCategory {
  type: "github-link";
  link: string;
}

export interface SearchCategory {
  type: "search";
}

export interface LocalDocCategory {
  type: "local-doc";
  displayName: string;
  firstPage: string | undefined;
  pages: LocalDocInformation[];
}

export interface LocalDocInformation {
  isPageGroup: boolean;
  displayName: string;
  inputFile?: string;
  outputFile?: string;
  pages?: LocalDocInformation[] | undefined;
  defaultOpen?: boolean;
}

interface RootDocConfigInput {
  logo?: {
    srcPath: string;
    link?: string;
  };
  favicon?: {
    srcPath: string;
  };
  otherVersionsLink?: string;
  linksLeft?: unknown[];
  linksRight?: unknown[];
}

interface InnerDocConfigInput {
  pages: InnerDocConfigInputPage[];
}

interface InnerDocConfigInputPage {
  path: string;
  displayName: string;
  defaultOpen?: boolean;
}

export interface LogoInformation {
  /** Optional link to redirect to when clicking on the logo. */
  link?: string | undefined;

  /** Optional URL to the image of the logo. */
  url?: string | undefined;

  /** Optional Path to the image of the logo. */
  srcPath?: string | undefined;
}

export interface VersionInformation {
  version: string;
  /** Optional link to redirect to when clicking on the version. */
  link?: string | undefined;
}

export type LinkCategory =
  | VersionCategory
  | ExternalLinkCategory
  | GithubLinkCategory
  | SearchCategory
  | LocalDocCategory;

export interface ParsedDocConfig {
  versionInfo: undefined | VersionInformation;
  logo: undefined | LogoInformation;
  favicon:
    | undefined
    | {
        srcPath?: string | undefined;
      };
  links: LinkCategory[];
  linksRightIndex: number;
}

export default async function parseDocConfigs(
  baseInDir: string,
  baseOutDir: string,
  version: string | undefined
): Promise<ParsedDocConfig> {
  const rootConfigFileName = path.join(baseInDir, ".docConfig.json");
  const rootConfig = await parseAndCheckRootConfigFile(rootConfigFileName);
  const ret: ParsedDocConfig = {
    versionInfo: undefined,
    logo: undefined,
    favicon: undefined,
    links: [],
    linksRightIndex: -1,
  };

  if (typeof version === "string") {
    ret.versionInfo = { version, link: undefined };
    if (typeof rootConfig.otherVersionsLink === "string") {
      ret.versionInfo.link = rootConfig.otherVersionsLink;
    }
  }

  if (typeof rootConfig.logo === "object") {
    ret.logo = rootConfig.logo;
  }

  if (typeof rootConfig.favicon === "object") {
    ret.favicon = rootConfig.favicon;
  }

  const linksLeft = rootConfig.linksLeft ?? [];
  const linksRight = rootConfig.linksRight ?? [];
  const categoryLinks = linksLeft.concat(linksRight);
  if (linksRight.length > 0) {
    ret.linksRightIndex = linksLeft.length;
  }

  for (let i = 0; i < categoryLinks.length; i++) {
    const category: unknown = categoryLinks[i];
    if (typeof category !== "object" || category === null) {
      if (i < linksLeft.length) {
        throw new Error(`Invalid element in \`linksLeft\` at index ${i}`);
      } else {
        throw new Error(
          `Invalid element in \`linksRight\` at index ${i - linksLeft.length}`
        );
      }
    }
    if (!("type" in category) || typeof category.type !== "string") {
      if (i < linksLeft.length) {
        throw new Error(
          `Element in \`linksLeft\` at index ${i} is missing its \`type\` property`
        );
      } else {
        throw new Error(
          `Element in \`linksRight\` at index ${i - linksLeft.length} is missing its \`type\` property`
        );
      }
    }

    let parsedCategory: LinkCategory | undefined;
    switch (category.type) {
      case "local-doc":
        if (!("path" in category) || typeof category.path !== "string") {
          throw new Error(
            `A "local-doc" element is missing its "path" property.`
          );
        }
        if (
          !("displayName" in category) ||
          typeof category.displayName !== "string"
        ) {
          throw new Error(
            `A "local-doc" element is missing its "path" property.`
          );
        }
        parsedCategory = await parseLocalDocCategory(
          { displayName: category.displayName, path: category.path },
          baseInDir,
          baseOutDir
        );
        break;
      case "version":
        parsedCategory = { type: "version" };
        break;
      case "link":
        if (!("link" in category) || typeof category.link !== "string") {
          throw new Error(`A "link" element is missing its "link" property.`);
        }
        if (
          !("displayName" in category) ||
          typeof category.displayName !== "string"
        ) {
          throw new Error(`A "link" element is missing its "path" property.`);
        }
        parsedCategory = {
          type: "external-link",
          link: category.link,
          displayName: category.displayName,
        };
        break;
      case "github-link":
        if (!("link" in category) || typeof category.link !== "string") {
          throw new Error(
            `A "github-link" element is missing its "link" property.`
          );
        }
        parsedCategory = {
          type: "github-link",
          link: category.link,
        };
        break;
      case "search":
        parsedCategory = { type: "search" };
        break;
    }
    if (parsedCategory !== undefined) {
      ret.links.push(parsedCategory);
    }
  }
  return ret;
}

async function parseLocalDocCategory(
  category: { displayName: string; path: string },
  baseInDir: string,
  baseOutDir: string
): Promise<LocalDocCategory> {
  const categoryPath = path.join(baseInDir, category.path);
  const categoryOutPath = path.join(baseOutDir, category.path);
  const parsedCategory: LocalDocCategory = {
    type: "local-doc",
    displayName: category.displayName,
    firstPage: "",
    pages: [],
  };
  const catCfgFileName = path.join(categoryPath, ".docConfig.json");
  const categoryConfig = await parseAndCheckSubConfigFile(catCfgFileName);
  for (const page of categoryConfig.pages) {
    const pagePath = path.join(categoryPath, page.path);
    let pageStat;
    try {
      pageStat = await promisify(fs.stat)(pagePath);
    } catch (err) {
      const srcMessage =
        ((err as { message: string }) ?? {}).message ?? "Unknown error";
      throw new Error(`Cannot run stat on "${pagePath}": ${srcMessage}`);
    }

    if (pageStat.isDirectory()) {
      const parsedPage: LocalDocInformation = {
        isPageGroup: true,
        defaultOpen: page.defaultOpen === true,
        displayName: page.displayName,
        pages: [],
      };
      parsedCategory.pages.push(parsedPage);
      const pageCfgFileName = path.join(pagePath, ".docConfig.json");
      const pageGroupConfig = await parseAndCheckSubConfigFile(pageCfgFileName);
      for (const subPage of pageGroupConfig.pages) {
        const subPagePath = path.join(pagePath, subPage.path);
        const subPageOutPath = path.join(
          categoryOutPath,
          page.path,
          subPage.path
        );
        let subPageState;
        try {
          subPageState = await promisify(fs.stat)(subPagePath);
        } catch (err) {
          const srcMessage =
            ((err as { message: string }) ?? {}).message ?? "Unknown error";
          throw new Error(`Cannot run stat on "${subPagePath}": ${srcMessage}`);
        }

        if (subPageState.isDirectory()) {
          throw new Error(
            'Category page depth cannot exceed 2 yet "' +
              subPagePath +
              '" is a directory.'
          );
        }
        const outputFile = path.join(
          path.dirname(subPageOutPath),
          path.basename(subPagePath, ".md") + ".html"
        );
        if (parsedPage.pages === undefined) {
          parsedPage.pages = [];
        }
        parsedPage.pages.push({
          isPageGroup: false,
          displayName: subPage.displayName,
          inputFile: path.normalize(path.resolve(subPagePath)),
          outputFile: path.normalize(path.resolve(outputFile)),
        });
      }
    } else if (pageStat.isFile()) {
      const outputFile = path.join(
        categoryOutPath,
        path.basename(pagePath, ".md") + ".html"
      );
      parsedCategory.pages.push({
        isPageGroup: false,
        displayName: page.displayName,
        inputFile: path.normalize(path.resolve(pagePath)),
        outputFile: path.normalize(path.resolve(outputFile)),
      });
    }
  }

  // Retrieve landing page for category == first page available
  if (parsedCategory.pages.length > 0) {
    if (!parsedCategory.pages[0].isPageGroup) {
      parsedCategory.firstPage = parsedCategory.pages[0].outputFile;
    } else if (
      parsedCategory.pages[0].pages !== undefined &&
      parsedCategory.pages[0].pages.length > 0
    ) {
      parsedCategory.firstPage = parsedCategory.pages[0].pages[0].outputFile;
    }
  }
  return parsedCategory;
}

/**
 * Parse root config file into a JS object and check that all properties are in
 * the right format.
 * Exit with a meaningful error if that's not the case.
 * @param {string} rootConfigFileName
 * @returns {Promise.<Object>}
 */
async function parseAndCheckRootConfigFile(
  rootConfigFileName: string
): Promise<RootDocConfigInput> {
  let configStr;
  try {
    configStr = await promisify(fs.readFile)(rootConfigFileName, "utf8");
  } catch (err) {
    const srcMessage =
      ((err as { message: string }) ?? {}).message ?? "Unknown error";
    throw new Error(
      'Impossible to read Root .docConfig.json file ("' +
        rootConfigFileName +
        '"): ' +
        srcMessage
    );
  }

  let config;
  try {
    config = JSON.parse(configStr) as unknown;
  } catch (err) {
    const srcMessage =
      ((err as { message: string }) ?? {}).message ?? "Unknown error";
    exitWithInvalidRootConfig(srcMessage);
  }

  if (typeof config !== "object" || config === null) {
    exitWithInvalidRootConfig("Should be under an object form.");
  }

  if ("logo" in config) {
    if (typeof config.logo !== "object" || config.logo === null) {
      exitWithInvalidRootConfig(
        `The "logo" property, if defined, should contain an object.`
      );
    }

    if (
      !("srcPath" in config.logo) ||
      typeof config.logo.srcPath !== "string"
    ) {
      exitWithInvalidRootConfig(
        `The "logo" property, if defined, should contain a "srcPath" ` +
          "property set as a string."
      );
    }

    if ("link" in config.logo && typeof config.logo.link !== "string") {
      exitWithInvalidRootConfig(
        `The "logo.link" property, if defined, should be set as a string.`
      );
    }
  }

  if ("favicon" in config) {
    if (typeof config.favicon !== "object" || config.favicon === null) {
      exitWithInvalidRootConfig(
        `The "favicon" property, if defined, should contain an object.`
      );
    }
    if (
      !("srcPath" in config.favicon) ||
      typeof config.favicon.srcPath !== "string"
    ) {
      exitWithInvalidRootConfig(
        `The "favicon" property, if defined, should contain a "srcPath" ` +
          "property set as a string."
      );
    }
  }

  if (
    "otherVersionsLink" in config &&
    typeof config.otherVersionsLink !== "string"
  ) {
    exitWithInvalidRootConfig(
      `The "otherVersionsLink" property, if defined, should be set as a string.`
    );
  }

  if ("linksLeft" in config && !Array.isArray(config.linksLeft)) {
    exitWithInvalidRootConfig(
      `The "linksLeft" property, if defined, should be set as an Array.`
    );
  }

  if ("linksRight" in config && !Array.isArray(config.linksRight)) {
    exitWithInvalidRootConfig(
      `The "linksRight" property, if defined, should be set as an Array.`
    );
  }

  return config;

  function exitWithInvalidRootConfig(reason: string): never {
    throw new Error(
      `Root .docConfig.json file ("${rootConfigFileName}") is invalid: ${reason}`
    );
  }
}

/**
 * @param {string} filename
 * @returns {Promise.<Object>}
 */
async function parseAndCheckSubConfigFile(
  filename: string
): Promise<InnerDocConfigInput> {
  let configStr;
  try {
    configStr = await promisify(fs.readFile)(filename, "utf8");
  } catch (err) {
    const srcMessage =
      ((err as { message: string }) ?? {}).message ?? "Unknown error";
    throw new Error(
      `Impossible to read "${filename}" config file: ${srcMessage}`
    );
  }

  let config;
  try {
    config = JSON.parse(configStr) as unknown;
  } catch (err) {
    const srcMessage =
      ((err as { message: string }) ?? {}).message ?? "Unknown error";
    throw new Error(`"${filename}" config file is invalid: ${srcMessage}`);
  }

  if (typeof config !== "object" || config === null) {
    throw new Error(
      `"${filename}" config file is invalid: ` +
        `Should be under an object form.`
    );
  }

  if (
    !("pages" in config) ||
    !Array.isArray(config.pages) ||
    config.pages.length === 0
  ) {
    throw new Error(
      `"${filename}" config file is invalid: ` +
        `Should have a "pages" property with at least one entry.`
    );
  }

  const outputPages = [];
  for (let i = 0; i < config.pages.length; i++) {
    const page: unknown = config.pages[i];
    if (typeof page !== "object" || page === null) {
      throw new Error(
        `"${filename}" config file is invalid: ` +
          `One of the element in "pages" has an invalid format ` +
          "(should be an object)."
      );
    }
    if (!("path" in page) || typeof page.path !== "string") {
      throw new Error(
        `"${filename}" config file is invalid: ` +
          `One of the element in "pages" has an invalid "path" property ` +
          "(should be a string)."
      );
    }

    if (!("displayName" in page) || typeof page.displayName !== "string") {
      throw new Error(
        `"${filename}" config file is invalid: ` +
          `One of the element in "pages" has an invalid "displayName" property ` +
          "(should be a string)."
      );
    }

    const pushedPage: InnerDocConfigInputPage = {
      path: page.path,
      displayName: page.displayName,
    };
    if ("defaultOpen" in page) {
      if (typeof page.defaultOpen !== "boolean") {
        throw new Error(
          `"${filename}" config file is invalid: ` +
            `One of the element in "pages" has an invalid "defaultOpen" property ` +
            "(should be a boolean or not defined)."
        );
      }
      pushedPage.defaultOpen = page.defaultOpen;
    }

    outputPages.push(pushedPage);
  }

  // TODO make TypeScript understand our checks here
  return { pages: outputPages };
}
