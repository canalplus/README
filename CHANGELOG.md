# 0.6.0 (2025-02-06)

## Features

- Add optional `siteMapRoot` option to generate a sitemap [#2]

## Other

- Display documentation search results as a tree [#1]
- Replace `elasticlunr` with `fuse.js` to improve some search results [#3]

# 0.5.0 (2024-01-29)

## Other

- Stop transforming various tokens (like `(c)` for the copyright logo or `...`
  for the ellipsis)

# v0.4.0 (2024-01-29)

## Breaking Changes

- Total overhaul of CLI tool options and of the JavaScript API
- Update anchor syntax rule to make it more compatibe to GitHub's and GitLab's
  own generator
- In local configurations, remove otherVersionsLink in profit of version.link

## Features

- Check validity of anchor links and display verbose warning when not available
- Add `defaultOpen` property to page groups in local configurations
- Add `clean` JS and CLI option
- Authorize http(s) url in media resources

## Bug fixes

- Pages: Avoid hiding header when content is not scrollable
- Fix false positives in table of contents generation
- Make search also work for text without the right header hierarchy

## Other

- Forbid copy of local media resources not inside the root directory for
  security
- Pages: content is now centered and has a higher minimal width
- Pages: don't underline the version number if there's no link
- Add documentation pages for README
- Stop generating XHTML as output

# v0.3.0 (2023-11-22)

## Other

- Rename project to README, and move it under a canalplus scope on npm to
  facilitate inside contributions

# v0.2.3 (2023-04-21)

## Bug fixes

- Fix multiple quick smooth navigation between inner links

# v0.2.2 (2023-04-20)

## Bug fixes

- Fix documentation page's script soft navigation

# v0.2.1 (2023-04-19)

## Bug fixes

- Fix header links when navigating in sub directories

# v0.2.0 (2023-04-15)

## Features

- Rewrote in TypeScript with now type declarations
- NodeJS API (as an import and no more as a script)

## Bug fixes

- Remove mention of "RxPlayer" in page titles
- Various minor CSS fixes

# v0.1.1 (2023-04-07)

## Bug fixes

- Fix placement of search icon

# v0.1.0 (2023-04-06)

Initial release
