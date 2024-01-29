import { AnyNode, load } from "cheerio";

export interface FileSearchIndex {
  h1: string | undefined;
  h2?: string | undefined;
  h3?: string | undefined;
  body: string | undefined;
  anchorH1?: string | undefined;
  anchorH2?: string | undefined;
  anchorH3?: string | undefined;
}

/**
 * Generate search data linked to the given content.
 * @param {string} contentHtml
 * @returns {Array.<Object>}
 */
export default function getSearchDataForContent(
  contentHtml: string
): FileSearchIndex[] {
  const indexForFile: FileSearchIndex[] = [];
  const $ = load(contentHtml);
  const children = $("body").children().toArray();

  let currentH1: string | undefined;
  let currentH2: string | undefined;
  let currentH3: string | undefined;
  let currentH1Anchor: string | undefined;
  let currentH2Anchor: string | undefined;
  let currentH3Anchor: string | undefined;
  let currentBody: string[] = [];
  let currentLevel: string | undefined;
  let lastAnchor: AnyNode | undefined;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    switch (child.name.toLowerCase()) {
      case "a":
        lastAnchor = children[i];
        break;
      case "h1":
        anounceLastElement();
        currentH1 = $(child).text();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        currentH1Anchor = getAnchorName(lastAnchor);
        currentH2 = undefined;
        currentH2Anchor = undefined;
        currentH3 = undefined;
        currentH3Anchor = undefined;
        currentLevel = "h1";
        break;
      case "h2":
        anounceLastElement();
        currentH2 = $(child).text();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        currentH2Anchor = getAnchorName(lastAnchor);
        currentH3 = undefined;
        currentH3Anchor = undefined;
        currentLevel = "h2";
        break;
      case "h3":
        anounceLastElement();

        // TODO We know that's the anchor's link is in the previous element.
        // That's pretty ugly but it works for now.
        // Find better solution
        currentH3 = $(child).text();
        currentH3Anchor = getAnchorName(lastAnchor);
        currentLevel = "h3";
        break;

      // case "pre":
      //   // code - do nothing?
      //   break;

      default:
        const text = $(child).text().replace(/\n/g, " ");
        if (text !== undefined && text.length > 0) {
          currentBody.push(text);
        }
        break;
    }
  }
  anounceLastElement();
  return indexForFile;

  function anounceLastElement() {
    if (currentLevel === "h3") {
      const body = currentBody.length > 0 ? currentBody.join(" ") : "";
      indexForFile.push({
        h1: currentH1,
        h2: currentH2,
        h3: currentH3,
        body,
        anchorH1: currentH1Anchor,
        anchorH2: currentH2Anchor,
        anchorH3: currentH3Anchor,
      });
    } else if (currentLevel === "h2") {
      const body = currentBody.length > 0 ? currentBody.join(" ") : "";
      indexForFile.push({
        h1: currentH1,
        h2: currentH2,
        body,
        anchorH1: currentH1Anchor,
        anchorH2: currentH2Anchor,
      });
    } else if (currentLevel === "h1") {
      const body = currentBody.length > 0 ? currentBody.join(" ") : "";
      indexForFile.push({
        h1: currentH1,
        body,
        anchorH1: currentH1Anchor,
      });
    }
    currentBody.length = 0;
  }

  function getAnchorName(elt: AnyNode | undefined) {
    if (elt === undefined) {
      return;
    }
    const name = $(elt).attr("name");
    if (name !== undefined && name.length > 0) {
      return name;
    }
  }
}
