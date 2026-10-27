import { afterEach, expect, it, vi } from "vitest";
import {
  compatibilitySupport,
  compatibilityDiff,
  retrieveCompatibility,
} from "../src/core/gamma/mdn-provider";
afterEach(() => vi.restoreAllMocks());
it("preserves support qualifications and never calls API presence a probe", () => {
  const support = compatibilitySupport(
    {
      api: {
        GPU: {
          __compat: {
            support: {
              chrome: { version_added: "113" },
              firefox: {
                version_added: "141",
                flags: [{ name: "pref" }],
                partial_implementation: true,
              },
              safari: { version_added: false },
              edge: [
                { version_added: "113" },
                {
                  version_added: "110",
                  version_removed: "112",
                  prefix: "test",
                },
              ],
            },
          },
        },
      },
    },
    ["api", "GPU"],
  );
  expect(support.chrome).toBe("added 113");
  expect(support.firefox).toContain("requires flags/preferences");
  expect(support.firefox).toContain("partial implementation");
  expect(support.safari).toBe("not supported");
  expect(support.edge).toContain("removed 112");
});
it("compares actual fields across dated revisions without inventing changes", () => {
  const before = {
    revision: "a",
    updatedAt: "2025-01-01",
    support: { chrome: "added 113", firefox: "not supported" },
  };
  expect(
    compatibilityDiff(
      { ...before, support: { ...before.support, firefox: "added 141" } },
      before,
    ),
  ).toEqual(["firefox: not supported → added 141"]);
  expect(compatibilityDiff(before, before)).toEqual([]);
});
it("only permits enumerated public compatibility topics", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  await expect(
    retrieveCompatibility("mdn my secret", new AbortController().signal),
  ).rejects.toThrow(/Use \/research/);
  expect(fetch).not.toHaveBeenCalled();
  await expect(
    retrieveCompatibility("mdn constructor", new AbortController().signal),
  ).rejects.toThrow(/Use \/research/);
  expect(fetch).not.toHaveBeenCalled();
});
it("retrieves two immutable revisions with actual date and source attribution", async () => {
  const a = "a".repeat(40),
    b = "b".repeat(40);
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("api.github.com"))
        return Response.json([
          { sha: a, commit: { committer: { date: "2026-10-20T12:00:00Z" } } },
          { sha: b, commit: { committer: { date: "2026-09-20T12:00:00Z" } } },
        ]);
      return Response.json({
        api: {
          GPU: {
            __compat: {
              support: {
                chrome: { version_added: "113" },
                firefox: { version_added: url.includes(a) ? "141" : false },
              },
            },
          },
        },
      });
    });
  const result = await retrieveCompatibility(
    "mdn webgpu",
    new AbortController().signal,
  );
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(result).toHaveLength(2);
  expect(result[0].url).toContain(`/blob/${a}/api/GPU.json`);
  expect(result[0].updatedAt).toBe("2026-10-20T12:00:00Z");
  expect(result[0].text).toContain("firefox: not supported → added 141");
  for (const [, options] of fetch.mock.calls)
    expect(options).toMatchObject({
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
    });
});
it("rejects malicious revision URLs and oversized responses", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json([
      {
        sha: "../../private",
        commit: { committer: { date: "2026-01-01T12:00:00Z" } },
      },
    ]),
  );
  await expect(
    retrieveCompatibility("mdn webgpu", new AbortController().signal),
  ).rejects.toThrow(/revision/);
  fetch.mockResolvedValue(new Response("x".repeat(250001)));
  await expect(
    retrieveCompatibility("mdn webgpu", new AbortController().signal),
  ).rejects.toThrow(/too large/);
});
