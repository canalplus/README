# README

## Overview

README is a very simple HTML documentation generator whose goal is to be as
pain-free as possible to put in place, maintain and navigate.

When relying on README, all you need to do is:

1. To write your documentation files in the same Markdown format you're used to
   (the full ubiquitous CommonMark syntax is handled, with no added special
   syntax).

    Note that links, including those between Markdown files, are handled, as
    well as things like embedded image, video and audio resources.

2. Put them in directories following a file tree architecture reflecting your
   wanted HTML documentation (categories in different directories, page groups
   as pages in the same subdirectory).

3. Add `.docConfig.json` files in the resulting directories and sub-directories
   to set-up configuration and indicate the pages' ordering.

Then you can run README on it to generate static HTML files which can directly
be served as your documentation. That's it!

## Installation

README is installable through your favorite node package manager (npm / yarn /
pnpm) by installing the `@canalplus/readme.doc` package:

```sh
# through npm
npm install @canalplus/readme.doc --save-dev

# or through yarn
yarn add @canalplus/readme.doc --dev
```

You should then be able to run it by referencing through its `readme.doc` name
in a `package.json` script or through `npx`:

```sh
# Output version
npx readme.doc -v
```

## Usage

Then producing your HTML documentation pages is straightforward.

Before going deep into all steps one by one, here is a brief description for
each one of them:

1. **Documentation Files**: Write documentation files in Markdown in a file tree
   architecture respecting the same structure you want in your HTML
   documentation (e.g. `Getting Started` pages in a given directory, `API`
   pages in another etc.).

2. **Configuration**: Add a `.docConfig.json` file, setting the documentation's
   global configuration, in your documentation's root directory

3. **Page Listing**: Add `.docConfig.json` files in each sub-directories to set
   the order of documentation pages as well as their name.

4. **Run**: Run the `readme.doc` command.

5. **Serve**: Serve the corresponding generated HTML pages.
