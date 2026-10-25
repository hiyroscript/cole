import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import {
  cp,
  readFile,
  writeFile,
  mkdtemp,
  rm,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
const executablePath = process.env.CHROMIUM_PATH || chromium.executablePath();
const path = process.cwd() + "/dist-extension";
const manifest = JSON.parse(await readFile(path + "/manifest.json", "utf8"));
assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "sidePanel"]);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.externally_connectable, undefined);
async function launch(extensionPath) {
  const context = await chromium.launchPersistentContext("", {
    executablePath,
    headless: true,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      "--no-sandbox",
      "--disable-extensions-except=" + extensionPath,
      "--load-extension=" + extensionPath,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  return { context, id: worker.url().split("/")[2] };
}
assert.equal(
  (await readdir(path + "/assets")).some((f) => /^(worker|transport)-/.test(f)),
  false,
);
let checks = 4;
const { context, id } = await launch(path);
try {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${id}/index.html`);
  await panel
    .getByRole("textbox", { name: "Message Gamma" })
    .fill("What is Cole?");
  await panel
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await panel
    .getByText("Cole is a local browser and device assistant.", {
      exact: false,
    })
    .waitFor();
  checks++;
  await panel.getByRole("button", { name: "Gamma", exact: true }).click();
  await panel.getByRole("button", { name: /Madon/ }).click();
  await panel.getByText("Madon is website-only.", { exact: false }).waitFor();
  assert.equal(
    await panel
      .getByRole("button", { name: "Download and initialize" })
      .isDisabled(),
    true,
  );
  await panel
    .getByRole("button", { name: "Switch to Gamma", exact: true })
    .click();
  checks++;
  const invalid = await panel.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "VAREK_ACTION",
      name: "eval",
      arg: "alert(1)",
    }),
  );
  assert.match(invalid.text, /Rejected/);
  checks++;
  const denied = await panel.evaluate(() =>
    chrome.runtime.sendMessage({ type: "VAREK_ACTION", name: "page", arg: "" }),
  );
  assert.match(denied.text, /restricted|not been granted/);
  checks++;
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.getByRole("button", { name: "Open full conversation" }).waitFor();
  checks++;
} finally {
  await context.close();
}
// Test the content-script implementation against a local fixture with a test-only,
// single-origin grant. The shipping manifest retains activeTab and no host grants.
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(
    '<!doctype html><html lang="en"><head><title>Inspection fixture</title><meta name="description" content="Known test page"></head><body><h1>A local fixture</h1><h2>Details</h2><p>Visible reader text.</p><img src="data:," alt="Test"><a href="#">Link</a></body></html>',
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const temporary = await mkdtemp(join(tmpdir(), "cole-extension-test-"));
await cp(path, temporary, { recursive: true });
await writeFile(
  join(temporary, "manifest.json"),
  JSON.stringify({ ...manifest, host_permissions: ["http://127.0.0.1/*"] }),
);
let fixtureContext;
try {
  const running = await launch(temporary);
  fixtureContext = running.context;
  const panel = await fixtureContext.newPage();
  await panel.goto(`chrome-extension://${running.id}/popup.html`);
  const tab = await fixtureContext.newPage();
  await tab.goto(`http://127.0.0.1:${port}/`);
  await tab.bringToFront();
  const metadata = await panel.evaluate(() =>
    chrome.runtime.sendMessage({ type: "VAREK_ACTION", name: "page", arg: "" }),
  );
  assert.match(metadata.text, /Inspection fixture/);
  assert.match(metadata.text, /"headings": 2/);
  assert.match(metadata.text, /"imagesWithoutAlt": 0/);
  checks++;
  const reader = await panel.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "VAREK_ACTION",
      name: "reader",
      arg: "",
    }),
  );
  assert.match(reader.text, /Visible reader text/);
  assert.match(reader.text, /not a semantic summary/);
  checks++;
  const pin = await panel.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "VAREK_ACTION",
      name: "tabs",
      arg: "pin",
    }),
  );
  assert.match(pin.text, /Pinned/);
  checks++;
  const unpin = await panel.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "VAREK_ACTION",
      name: "tabs",
      arg: "unpin",
    }),
  );
  assert.match(unpin.text, /Unpinned/);
  checks++;
} finally {
  await fixtureContext?.close();
  await new Promise((resolve) => server.close(resolve));
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  `Extension: ${checks} checks passed. Production permission denial and local-fixture page extraction verified.`,
);
