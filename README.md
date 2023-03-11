# docgen.ico

This is my own documentation generator.

For my personal (and some professional) projects, I prefer relying on it because:
  - I find `docusaurus` too huge, complex, tightly-linked to other solutions like react and algolia (at least last time I checked) and it adds its own syntax on top of markdown, I would prefer a simple tool which can also be looked through its original markdown files (e.g. through GitHub's interface)
  - `docsify` runs JavaScript to translate markdown on the fly - this is fun but I prefer when its just HTML files and when it works without JS on - and needs some setup.

Hence this tool.

If you want to see an example, look at the [RxPlayer's documentation](https://developers.canal-plus.com/rx-player/doc/Getting_Started/Welcome.html).
_Yes I should probably have generated that tool's documentation through it, but I wrote this README in a haste so not for now._

## How to use it

If you want to use this, just create a directory where you documentation is, put a `.docConfig.json` JSON file at its root with the following format:
```json
{
  // Optional object to define a logo which will be located on the top left of
  // each page. That logo is optionally a link to some other page.
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

You can then put your documentation files as markdown files in the directory previously signaled through `"local-doc"` links.

Those markdown files don't have to contain anything special other than the usual CommonMark markdown and links between markdown files or to images will automatically be translated once the corresponding HTML is generated.

In those directories, you can create subdirectories to group documentation markdown files together. This will be reflected in the generated doc as a documentation group. For now, there can be only one level of subdirectories (which means the `"local-doc"` directory and its subdirectories, no further ones inside the latter).

At last, in each of the directories where markdown files are (the `"local-doc"` directories and their optional subdirectories), add another `.docConfig.json` file, which can look like that:
```json
{
  // Documentation pages, that will be linked from top to bottom
  "pages": [
    {
      // Relative path to the markdown file.
      "path": "./Welcome.md",

      // Name actually displayed for the link to it on the generated HTML page
      "displayName": "Welcome"
    },
    {
      // Relative path to a subdirectory
      "path": "./Tutorials",

      // Name actually displayed for this directory's title on the generated
      // HTML page
      "displayName": "Tutorials"
    },
    // ...
  ]
}
```

You can then generate the doc by running:
```sh
docgen.ico <PATH_TO_THE_DOC_ROOT> <PATH_FOR_THE_GENERATED_PAGES> ["<OPTIONAL_VERSION>"]
```

Where:
  - `PATH_TO_THE_DOC_ROOT`: is the original root where your initial
    `.docConfig.json` is
  - `PATH_FOR_THE_GENERATED_PAGES` is the path where the corresponding HTML
    pages will be generated. It can also be inside if you want
    `PATH_TO_THE_DOC_ROOT`.
  - `OPTIONAL_VERSION` is completely optional and is the current version of the
    project, which might be used depending on your configuration.

You then have all your generated HTML documentation pages inside `PATH_FOR_THE_GENERATED_PAGES`.

That's all folks!
