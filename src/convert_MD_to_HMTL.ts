import hljs from "highlight.js";
import MarkdownIt from "markdown-it";

// We just rely on the `markdown-it` dependency to create an HTML rendition of
// your Markdown file.
const md = MarkdownIt({
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch {
        /* don't care for now */
      }
    }
    return "";
  },
  html: true,
});

/**
 * Convert the Markdown document given into an HTML page.
 * @param {string} mdStr
 * @returns {string}
 */
export default function convertMDToHTML(mdStr: string): string {
  return md.render(mdStr);
}
