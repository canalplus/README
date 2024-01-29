# Configuration

## Root configuration overview

Now that you know [how to write your documentation files](./Documentation_Files.md),
and chose a root directory where to put them, you'll need to indicate to README
how you want your documentation to be generated:

-   To indicate how your documentation is divided. For example you might have a
    "Getting Started", a "Tutorial", an "API" and/or a "Reference" that you want
    to keep separated on the produced documentation.

-   To add external links, such as to your repository, to your demo or to a blog

-   To display a logo for your project, add a favicon etc.

All of this is done with a `.docConfig.json` file to put at your project
documentation's root directory.

## Format and properties

As its extension suggests, `.docConfig.json` is a JSON file.

Here is a completely documented and exhaustive example of one. Note that all
properties indicated as "optional" can be omitted:

```json
{
  // Optional object to define a logo which will be located on the top left of
  // each page. That logo is optionally a link to some other page, depending if
  // its `link` property below is defined.
  "logo": {
    // Local path (can be relative to the current directory) to the image of the
    // logo
    "srcPath": "./images/logo.png",

    // Optional link to redirect to when the logo is clicked. Can be ignored in
    // which case the logo is not clickable
    "link": "https://homepageoftheproject.html"
  },

  // Optional object to define a favicon for the documentation pages
  "favicon": {
    // Local path (can be relative to the current directory) to the image of the
    // favicon
    "srcPath": "./images/favicon.ico"
  },

  // Optional link when clicking on the current version which is optionally
  // displayed on the page (see below)
  // Can be ignored in which case the version is not clickable
  "otherVersionsLink": "https://example.com/documentation_pages_by_version.html",

  // Links available at the top of the page, on the left-side of it from left to
  // right.
  //
  // Each of those items will have a format which is dependant on its `"type"`
  // property. We'll look over all possibilities.
  "linksLeft": [
    {
      // `"local-doc"` are relative links to where your markdown documentation
      // is. You can see below more information on how you can organize the
      // corresponding directory.
      "type": "local-doc",

      // Relative path to that directory.
      "path": "./Getting_Started",

      // Name displayed for the link to that directory on the generated HTML pages.
      "displayName": "Getting Started"
    },
    {
      "type": "local-doc",
      "path": "./api",
      "displayName": "API"
    },
    {
      // `"link"` are external links. You will quit the documentation when
      // clicking on it.
      "type": "link",

      // The corresponding link
      "link": "https://www.example.com/demo/",

      // Name displayed for the link to that directory on the generated HTML pages.
      "displayName": "Demo"
    },
    {
      // Special type which leads to be able to search documentation
      // The documentation is automatically generated and is done entirely through
      // JavaScript, without relying on external actors.
      "type": "search"
    }
  ],
  "linksRight": [
    {
      // `"github-link"` is a special kind of link (with its own logo),
      // redirecting to the github link of the project, if one.
      //
      // Yes, I should probably also either do gitlab, sourcehut etc. or just
      // provide some generic mean but this is just a quick project after all
      "type": "github-link",

      // Corresponding link
      "link": "https://github.com/name/repo"
    },
    {
      // Special type which displays the current project's version.
      // It is optionally clickable depending on if you defined the
      // `otherVersionsLink` property
      "type": "version"
    }
  ]
}
```

Once you're done creating one for your project, we can continue by listing all
documentation pages inside each categories and its subdirectories.
