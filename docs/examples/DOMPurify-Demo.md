# DOMPurify demo

This demo shows a few examples of dangerous or surprising HTML that a naive Markdown renderer
might allow through. The MarkType preview passes generated HTML through DOMPurify, which removes
or neutralizes active content so it cannot execute in the browser.

<!-- show-sanitized -->

> Warning: the examples below are intentionally malicious-looking. They are safe in MarkType's
> preview because DOMPurify sanitizes them. Do not copy/paste dangerous payloads into real sites.

## 1) Image with onerror (commonly used XSS trick)

The following image tag includes an `onerror` handler that would run JavaScript if executed:

```html
<img src="invalid.png" onerror="alert('XSS via image onerror')" alt="broken image">
```

In MarkType this should render as a non-executable broken image; the `onerror` attribute will be
removed by DOMPurify.

Explanation: some attackers use intentionally-broken image URLs with an `onerror` handler to
execute JavaScript when the image fails to load. DOMPurify strips dangerous event handler
attributes (like `onerror`, `onclick`, etc.), so the image may still show as broken but it will
not run the injected JavaScript.

Live (raw) example below — this HTML will be parsed into the document and then sanitized by
DOMPurify, so any active attributes will be removed before it is inserted into the DOM:

<img src="invalid.png" onerror="alert('XSS via image onerror')" alt="broken image">

## 2) Inline script tag (should be stripped entirely)

```html
<script>
  alert('This script tag will be removed by the sanitizer');
</script>
```

DOMPurify removes `<script>` tags entirely from the HTML output. Script tags can execute code
immediately when the HTML is inserted into the page, so removing them prevents inline scripts
from running (and stops common attack payloads embedded directly in markup).

Explanation: scripts are a direct execution vector. Sanitizers remove these tags because allowing
them would let an attacker run arbitrary JavaScript in the context of the page.

Live (raw) example below — a raw <script> tag in the markdown will be stripped by DOMPurify and
won't execute in the preview:

<script>
  alert('This script tag will be removed by the sanitizer');
</script>

## 3) javascript: link (dangerous href)

```html
<a href="javascript:alert('XSS via link')">Click me (javascript: link)</a>
```

DOMPurify will either remove or neutralize dangerous URL schemes (like `javascript:`) in `href`
attributes. This prevents attackers from injecting links that execute code when clicked.

Explanation: an anchor tag with a `javascript:` URL executes code in the page when clicked. A
sanitizer rewrites or removes these attributes so the link becomes inert (or the href is
omitted), avoiding that execution.

Live (raw) example below — the following link includes a `javascript:` URL; DOMPurify will
neutralize it when the HTML is inserted into the document:

<a href="javascript:alert('XSS via link')">Click me (javascript: link)</a>

## 4) SVG with script / foreignObject (advanced payloads)

```html
<svg xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100" height="50">
    <body xmlns="http://www.w3.org/1999/xhtml">
      <script>alert('XSS via SVG foreignObject')</script>
    </body>
  </foreignObject>
</svg>
```

SVGs and their embedded elements (including `foreignObject`) can contain scripts or markup that
execute. DOMPurify removes script elements inside SVG and strips potentially dangerous
sub-elements or attributes. This prevents attackers from using SVG to smuggle executable code
into otherwise-safe images.

Explanation: SVGs are XML and can embed HTML-like content. Attackers have used SVG/foreignObject
to place executable code in what looks like an image; sanitizers must treat SVG as a potential
execution surface and remove dangerous parts.

Live (raw) example below — this SVG includes an inline script which DOMPurify will remove:

<svg xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100" height="50">
    <body xmlns="http://www.w3.org/1999/xhtml">
      <script>alert('XSS via SVG foreignObject')</script>
    </body>
  </foreignObject>
</svg>

## 5) iframe injection

```html
<iframe src="javascript:alert('XSS via iframe')"></iframe>
```

iframes with `javascript:` URLs are unsafe and will be blocked or removed by DOMPurify.

Explanation: injecting an iframe with a `javascript:` or other unsafe `src` can cause immediate
code execution or unexpected navigation. DOMPurify will remove such iframes or sanitize their
attributes to keep the DOM safe.

Live (raw) example below — an iframe using a `javascript:` URL is unsafe and will be stripped or
neutralized by DOMPurify:

<iframe src="javascript:alert('XSS via iframe')"></iframe>

---

If you open this file in MarkType's preview you should see the HTML stripped or rendered inert —
no alerts, no scripts, and no inline handlers should execute. This demonstrates how DOMPurify
protects the generated HTML before it is inserted into the DOM.
