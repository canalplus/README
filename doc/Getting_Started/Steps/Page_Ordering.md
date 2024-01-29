# Page Listing

## Overview

Your documentation pages should be inside the "Categories" directories you
configured in [your global configuration file](./Configuration.md) (as
`local-doc` links inside either the `linksLeft` or the `linksRight` property of
it).

To let README know how to name your various documentation files and in which
order they should be shown, you will now also have to add `.docConfig.json`
files inside all the inner directories where your Markdown documentation pages
are found.

For example, let's consider a case where files are put in a `doc` root
directory:

```
doc                                  # Root directory
│
├── .docConfig.json                  # Global configuration
│
├── Getting_Started                  # "Getting Started" Category
│   ├── .docConfig.json              # Local configuration (we'll see that here)
│   ├── Steps                        # Page group
│   │   ├── .docConfig.json          # Local configuration
│   │   ├── Configuration.md
│   │   ├── Documentation_Files.md
│   │   ├── Page_Ordering.md
│   │   ├── Run.md
│   │   └── Serve.md
│   ├── Home.md
│   └── HTML_Page_features.md
│
└── API                              # Another Category, "API"
    ├── .docConfig.json              # Local configuration
    ├── CLI.md
    └── ...
```

Note however that the syntax of those `.docConfig.json` files is
different than the one of the global configuration, that's what we'll see here.

## Local configurations content

Those "local" `.docConfig.json` just needs to be given:

-   The order in which documentation pages should be showned. This is achieved
    by listing those pages in a `pages` array property. Pages are listed from
    top to bottom.

-   For each page, a link to the Markdown file containing the documentation you
    want to show, as well as the name with which it should be referred to.

-   Optionally for page groups (directories), you can indicate if you want this
    page groups to be opened by default when going to the documentation.

    If not, the page group will only be opened if either the reader opened it,
    or if the current visualized page is inside that page group.

Here is a completely annotated example:

```json
{
  // Documentation pages, that will be linked from top to bottom
  "pages": [
    {
      // Relative path to the markdown file.
      "path": "./Home.md",

      // Name actually displayed for the link to it on the generated HTML page
      "displayName": "Welcome"
    },
    {
      // Relative path to a subdirectory
      "path": "./Steps",

      // Name actually displayed for this directory's title on the generated
      // HTML page
      "displayName": "Step by step guide"

      // Optionally for page groups (when the path is a directory), you can
      // set `defaultOpen` to `true` if you want the page group to be open
      // by default.
      // This property is set to false by default, meaning that page groups
      // are closed by default.
      "defaultOpen": true,
    }
    {
      "path": "./HTML_Page_features.md",
      "displayName": "Features of the HTML pages"
    }
  ]
}
```

You'll have to add a `.docConfig.json` file in each directory in which
documentation pages are found:

-   In the "Categories" directories (those behind a `local-doc` link in the
    global configuration)

-   In all the page groups inside those directories (meaning: the
    subdirectories, which themselves had to be referenced in the
    `.docConfig.json` of the corresponding Category)

Let's see again the example at the top of this page:

```
doc                                  # Root directory
│
├── .docConfig.json                  # Global configuration
│
├── Getting_Started                  # "Getting Started" Category
│   ├── .docConfig.json              # Local configuration
│   ├── Steps                        # Page group
│   │   ├── .docConfig.json          # Local configuration
│   │   ├── Configuration.md
│   │   ├── Documentation_Files.md
│   │   ├── Page_Ordering.md
│   │   ├── Run.md
│   │   └── Serve.md
│   ├── Home.md
│   └── HTML_Page_features.md
│
└── API                              # Another Category, "API"
    ├── .docConfig.json              # Local configuration
    ├── CLI.md
    └── ...
```

You can see in this example that there are three "local configuration" files:

1.  Inside the `doc/Getting_Started` Category directory

2.  Inside the `doc/Getting_Started/Steps` page group

2.  Inside the `doc/API` Category directory
