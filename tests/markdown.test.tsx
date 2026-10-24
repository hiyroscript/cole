import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/Markdown";
import React from "react";
it("does not execute raw HTML", () => {
  const h = renderToStaticMarkup(
    <Markdown text={"<script>alert(1)</script><img src=x onerror=alert(1)>"} />,
  );
  expect(h).not.toContain("<script");
  expect(h).not.toContain("<img");
});
it("does not render javascript links", () => {
  const h = renderToStaticMarkup(
    <Markdown text={"[run](javascript:alert%281%29)"} />,
  );
  expect(h).not.toContain("href=");
});
it("permits safe reference links", () =>
  expect(
    renderToStaticMarkup(<Markdown text={"[docs](https://example.com)"} />),
  ).toContain("noopener noreferrer"));

it("does not load remote Markdown images", () =>
  expect(
    renderToStaticMarkup(
      <Markdown text={"![tracking](https://example.com/pixel)"} />,
    ),
  ).not.toContain("<img"));
