# CLI API

## Preamble

You can interact with README with two ways: with the CLI API (running
`readme.doc` in the command line, through `npx` or through an npm script) or
with the JavaScript API (importing `"readme.doc"` in a JavaScript / TypeScript
file).

This page is going to focus on the CLI API.

## CLI Options

### Format

CLI options are means to configure or to give information (such as your
documentation's root directory) to the `readme.doc` command.

They each exist in two possible forms:

- A long form, starting with two dashes (`--`). For example `--input`

- A short single-letter form starting with a single dash `-`. For example `-i`,
  which is equivalent to `--input`.

Some options need an argument, which has to be added after the option (and
separated with it by a space). For example `--input` takes in argument the
documentation root directory as a path:

```sh
readme.doc --input ./my_root_directory`
```

Others don't have any argument, for example `--help`:

```sh
readme.doc --help
```

Options cannot be "combined" behind a single dash, like you may be used to with
GNU utils. They have to be separately specified:

```sh
# This won't work
readme.doc -ih
```

### Special options

The `readme.doc` has two options which will just lead it to output information
and exit as soon as the option is encountered:

- `--help` (or `-h` in short form): displays a list of available commands with a
  short description.

  This command doesn't take any argument.

- `--version` (or `-v` in short form): displays the current version of the
  README tool you installed.

  This command doesn't take any argument.

## Mandatory options

For any other cases when none of those options are relied on, you will need to
specify at least the following two options:

- `--input` (or `-i` in short form): To specify your input root directory (where
  the `.docConfig.json` global configuration can be found) as this command's
  argument.

- `--output` (or `-o` in short form): To specify the output root directory
  (where the generated HTML files will be added) as this command's argument.

Note that it is perfectly valid to set an `output` inside the `input` directory.
For example, you could want to call `readme.doc` this way:

```sh
# This won't work
readme.doc --input ./doc --output ./doc/generated
```

## Recommended supplementary options

The `readme.doc` command has two supplementary options we heavily recommend you
to also use for each documentation generation:

- `--clean` (or `-c` in short form): Removes the output directory if it existed
  previously.

  Without this option, README will never remove files inside the output
  directory, which mean it could grow indefinitely if you're not careful.

  This command doesn't take any argument.

- `--project-version` (or `-p` in short form), To specify the current version of
  your project (in argument of that option), which will thus be indicated in the
  produced documentation pages.

  If your project is a JavaScript project with a `package.json` file, you could
  just rely on the `version` anounced in that file (e.g. by calling
  `node -e "console.log(require('./package.json').version)")` to set that
  property.

## Examples of recommended commands

For example, if your root directory is `doc` and you want to generate your HTML
documentation in `doc/generated`, you can run:

```sh
readme.doc --clean --input doc --output doc/generated
```

If you're on a JavaScript project, you can also easily rely programatically on
your project's version anounced in its `package.json` file:

```sh
readme.doc --clean --input doc --output doc/generated --project-version $(node -e "console.log(require('./package.json').version)")
```

## Output

The `readme.doc` won't produce any output if the doc could be generated with
success.

If any error arised which prevented the documentation generation to finish, an
error message beginning with `[ERROR]` explaining the issue will be outputed to
stderr.

If an error arised but it did not prevent the documentation generation from
finishing, an error message beginning with `[WARNING]` explaining the issue will
be outputed to stderr. Even if those do not prevent the documentation generation
from finishing, we recommend that you resolve any issue it has seen to ensure a
good experience when navigating the generated documentation.
