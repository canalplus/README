/**
 * Class responsible for creating and managing a sitemap.
 * It allows adding URLs to the sitemap and generating an XML file of the sitemap.
 * This is used by search engines to crawl and index files.
 */
export class SiteMapCreator {
  /**
   * @private
   * @type {Array<{ loc: string, lastmod: string }>}
   * @description Stores the list of URLs and their corresponding last modified dates.
   */
  private siteMapEntry: Array<{ loc: string; lastmod: string }>;

  constructor() {
    this.siteMapEntry = [];
  }

  /**
   * Adds a new URL to the sitemap.
   * The `lastmod` (last modification date) is automatically set to the current date in the format `YYYY-MM-DD`.
   *
   * @param {string} loc - The URL to be added to the sitemap.
   * @example
   * const sitemap = new SiteMapCreator();
   * sitemap.addToSiteMap('https://mydoc.com');
   */
  public addToSiteMap(loc: string) {
    this.siteMapEntry.push({
      loc,
      lastmod: new Date().toISOString().split("T")[0],
    });
  }

  /**
   * Generates the XML for the sitemap.
   * This method converts the list of entries into a properly formatted XML string.
   *
   * @returns {string} The XML string representing the sitemap.
   */
  public generateSiteMapXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${this.siteMapEntry
      .map(
        (entry) => `<url>
      <loc>${entry.loc}</loc>
      <lastmod>${entry.lastmod}</lastmod>
    </url>
    `,
      )
      .join("")}
  </urlset>`;
  }
}
