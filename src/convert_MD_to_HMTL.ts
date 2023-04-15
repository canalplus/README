import hljs from "highlight.js";
import MarkdownIt from "markdown-it";

const md = MarkdownIt({
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {
        /* don't care for now */
      }
    }
    return "";
  },
  html: true,
  linkify: true,
  typographer: true,
  xhtmlOut: true,
});

/**
 * Convert the Markdown document given into an HTML page.
 * @param {string} mdStr
 * @returns {string}
 */
export default function convertMDToHTML(mdStr: string): string {
  return md.render(mdStr);
}
