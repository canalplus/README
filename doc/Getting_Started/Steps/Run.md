# Run

## Overview

Now that the documentation is written and that configuration files are added
(see previous steps), we can finally generate the documentation's HTML pages.

This can be done in two ways: using the command line interface (CLI) API, or by
running it through JavaScript.

## Through the CLI

The most straightforward way to run README is through the command line.

The `readme.doc` command (that you installed with the README package), has
multiple flags and options.

There is two mandatory options:

- `--input [input]` (or `-i [input]`), with `[input]` being the root directory
  where your documentation (in Markdown) resides.

- `--output [output]` (or `-o [output]`), with `[output]` being the
  destination directory where HTML files will be generated.

  Note that the output directory can be inside the input directory. It's for
  example a frequent usage to set a `doc` input directory and a
  `doc/generated` output directory.

There are also two other heavily recommended options:

- `--clean` (or `-c`): Removes the output directory if it existed previously.

  Without this option, README will never remove files inside the output
  directory, which mean it could grow indefinitely if you're not careful.

- `--project-version [version]` (or `-p [version]`), with `[version]` being
  the current version of your project: Allows to indicate in your
  documentation pages the version they apply to.

  If your project is a JavaScript project with a `package.json` file, you
  could just rely on the `version` anounced in that file (e.g. by calling
  `node -e "console.log(require('./package.json').version)")` to set that
  property.

For example, if your root directory is `doc` and you want to generate your
HTML documentation in `doc/generated`, you can run:

```sh
readme.doc --clean --input doc --output doc/generated
```

If you're on a JavaScript project, you can also easily rely programatically on
your project's version anounced in its `package.json` file:

```sh
readme.doc --clean --input doc --output doc/generated --project-version $(node -e "console.log(require('./package.json').version)")
```

## Through the JavaScript API

The JavaScript README module exposes by default a function taking three
arguments:

1. The input directory
2. The output directory
3. The other options, including `clean` (to remove the output directory if it
   already existed) and `version` (the current version of your project)

Here's an example of how you could call it:

```js
import readme from "@canalplus/readme.doc";

readme("./doc", "./doc/generated", {
  clean: true,
  version: "1.2.5",
});
```
