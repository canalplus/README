# Serve

## Overview

If you followed all preceding steps, you've now finished generating your
documentation and their HTML pages now reside in the output directory.

You'll now need to serve those files somewhere so that they can be accessible by
your users.

## Testing locally

You can check locally if you're satisfied with the generated documentation by
just launching an HTTP server serving statically local files.

No server is included with README as staying simple and minimal is one of its
core goal. However, we frequently rely on
[http-server](https://www.npmjs.com/package/http-server) for local tests. You
may also rely on it by calling:

```sh
npx http-server
```

Once your local server is started, go to its URL and navigate to one of your
documentation's HTML page (you may have to navigate your files first).

Once on one of the generated HTML page, you'll be able to see the final result.

_Note that technically, you could also make your web browser read directly your
local files without needing to run an HTTP server. However doing that is not
recommended as it may lead to some features not working as intended due to
security reasons. As an example, search usually won't work properly if you're
not going through an HTTP server._

## Serving the final documentation

If you're satisfied with it, you can now just deploy the output directory
online.

Note that all you need is just serving statically the generated file, there's no
further server-side logic than that.

As such, free offerings like GitHub pages are fully compatible with README (on
that note, the current page is served thanks to that service).
