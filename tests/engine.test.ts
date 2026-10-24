import { describe, it, expect } from "vitest";
import { knowledge } from "../src/data/knowledge";
import { rank, normalize, distance } from "../src/core/matcher";
import { respond, freshContext } from "../src/core/gamma/engine";
import { emptyContext, type Evidence } from "../src/core/types";
import { commands, executeCommand, parseCommand } from "../src/core/commands";
import { identify, platform } from "../src/lib/diagnostics";
import { flows, flowReply } from "../src/core/flows";
import { validExtensionRequest } from "../src/lib/extension";
import { stream } from "../src/core/stream";
const facts: Evidence[] = [
  {
    group: "Browser",
    label: "Browser family",
    value: "Firefox",
    kind: "Estimated",
  },
  {
    group: "Device",
    label: "Approximate memory (GB)",
    value: "Not exposed",
    kind: "Unavailable",
  },
];
const options = { thinking: "auto" as const, facts: async () => facts };
describe("Authored expressions", () => {
  for (const k of knowledge)
    for (const phrase of k.phrases)
      it(`${k.id}: ${phrase}`, () =>
        expect(rank(phrase)[0]?.record.id).toBe(k.id));
});
describe("Independent language cases", () => {
  const cases = [
    ["Could you detect my browsr please?", "browser"],
    ["My broswer is sluggish", "slow"],
    ["The browser keeps crashing", "crash"],
    ["Can I check my RAM?", "ram"],
    ["Why is my laptop hot?", "heat"],
    ["Could you explain local storage?", "localstorage"],
    ["I need to restore a closed tab", "restore-tab"],
    ["How can I improve my privacy?", "privacy"],
    ["Compare Chrome and Firefox", "compare"],
    ["Does this work offline?", "offline"],
    ["What is DNS?", "dns"],
    ["What is WebAssembly?", "wasm"],
    ["How do I clear my cache?", "cache"],
    ["Can you inspect my other apps?", "limits"],
    ["Switch to Madon", "madon"],
  ];
  for (const [q, id] of cases)
    it(q, async () =>
      expect((await respond(q, emptyContext(), options)).context.intent).toBe(
        id,
      ),
    );
  it("normalizes Unicode punctuation", () =>
    expect(normalize("What’s  my Browser?")).toBe("whats my browser"));
  it("bounded edit distance", () =>
    expect(distance("browser", "browzer")).toBe(1));
  it("answers browser confirmation from evidence", async () => {
    const r = await respond("Am I on Chrome?", emptyContext(), options);
    expect(r.text).toContain("does not confirm chrome");
    expect(r.text).toContain("Firefox");
  });
  for (const q of [
    "write me a love poem",
    "who won the football game",
    "tell me a joke about giraffes",
    "make a recipe for dinner",
    "predict tomorrow’s stock prices",
    "translate my novel to French",
  ])
    it("unsupported: " + q, async () =>
      expect((await respond(q, emptyContext(), options)).text).toContain(
        "reliable answer",
      ),
    );
  it("rejects a negated symptom", async () =>
    expect(
      (await respond("My browser is not slow", emptyContext(), options)).text,
    ).toContain("happening instead"));
  it("handles a negation with a replacement symptom", async () =>
    expect(
      (
        await respond(
          "My browser is not slow but keeps crashing",
          emptyContext(),
          options,
        )
      ).context.intent,
    ).toBe("crash"));
  it("two independent topics", async () =>
    expect(
      (await respond("what is DNS and what is HTTPS", emptyContext(), options))
        .text,
    ).toContain("### HTTPS"));
  it("greeting is not analysis", async () =>
    expect(
      (await respond("Hello", emptyContext(), options)).analysis,
    ).toBeUndefined());
  it("uses correction in follow-ups", async () => {
    const r = await respond(
      "Actually, I’m using Safari.",
      emptyContext(),
      options,
    );
    const p = await respond("What about privacy?", r.context, options);
    expect(p.text).toContain("Safari".toLowerCase());
  });
  it("contextual sequence and requested depth", async () => {
    let r = await respond("What browser am I using?", emptyContext(), options);
    r = await respond("Is it secure?", r.context, options);
    expect(r.context.intent).toBe("secure");
    r = await respond("How do I make it faster?", r.context, options);
    expect(r.context.intent).toBe("slow");
    r = await respond("Give me the steps", r.context, options);
    expect(r.text).toContain("1.");
    r = await respond("Make that shorter", r.context, options);
    expect(r.context.depth).toBe("brief");
    expect(r.text).not.toContain("1.");
  });
  it("quick check preserves troubleshooting subject", async () => {
    const a = await respond("Why is my browser slow?", emptyContext(), options);
    const b = await respond("Quick check", a.context, options);
    expect(b.evidence).toEqual(facts);
    const c = await respond("What should I try first?", b.context, options);
    expect(c.text).toContain("close unused heavy tabs");
  });
  it("branches on observations", async () => {
    const a = await respond("Why is my browser slow?", emptyContext(), options);
    expect(a.context.diagnosis?.node).toBe("scope");
    const b = await respond("Yes", a.context, options);
    expect(b.text).toContain("Focus on that site");
    const c = await respond("No", b.context, options);
    expect(c.text).toContain("browser support");
    expect(c.context.diagnosis?.node).toBe("confirm");
  });
  it("off skips optional workflow", async () => {
    const r = await respond("Why is my browser slow?", emptyContext(), {
      ...options,
      thinking: "off",
    });
    expect(r.analysis).toBeUndefined();
    expect(r.context.flow).toBeUndefined();
  });
  it("on performs relevant analysis", async () =>
    expect(
      (
        await respond("What is HTTPS?", emptyContext(), {
          ...options,
          thinking: "on",
        })
      ).analysis?.length,
    ).toBeGreaterThan(0));
  it("expires old context", () => {
    const c = emptyContext();
    c.intent = "slow";
    c.updated = 0;
    expect(freshContext(c).intent).toBeUndefined();
  });
  it("bounds conversation window", () => {
    const c = emptyContext();
    c.turns = 24;
    c.intent = "slow";
    expect(freshContext(c).intent).toBeUndefined();
  });
  it("does not mutate prior context", async () => {
    const c = emptyContext();
    await respond("My browser is slow", c, options);
    expect(c.intent).toBeUndefined();
  });
  it("short yes needs an active question", async () =>
    expect((await respond("Yes", emptyContext(), options)).text).toContain(
      "Which check",
    ));
});
describe("Commands and boundaries", () => {
  it("recognizes run syntax", () =>
    expect(parseCommand("Run /browser")).toEqual({ name: "browser", arg: "" }));
  it("validates theme argument", async () =>
    expect(
      (await executeCommand("theme", "orange", emptyContext(), [])).effect,
    ).toBeUndefined());
  it("produces typed preference effects", async () =>
    expect(
      (await executeCommand("theme", "dark", emptyContext(), [])).effect,
    ).toEqual({ type: "theme", value: "dark" }));
  it("rejects unexpected arguments", async () =>
    expect(
      (await executeCommand("browser", "delete", emptyContext(), [])).text,
    ).toContain("does not accept"));
  it("unknown command cannot execute code", async () =>
    expect(
      (await executeCommand("eval", "alert(1)", emptyContext(), [])).text,
    ).toContain("Unknown command"));
  for (const cmd of commands.filter((c) => c.extension))
    it(cmd.name + " is gated", async () =>
      expect(
        (
          await executeCommand(
            cmd.name,
            cmd.name === "tabs" ? "pin" : "",
            emptyContext(),
            [],
          )
        ).text,
      ).toContain("requires the Varek Chromium extension"),
    );
  it("unavailable memory is not fabricated", async () => {
    const r = await respond("Can I check my RAM?", emptyContext(), options);
    expect(r.evidence?.[0].kind).toBe("Unavailable");
  });
  it("current-browser unavailable values stay explicit", () =>
    expect(identify("unknown")).toEqual({
      family: "Unknown",
      version: "Unavailable",
    }));
  it("Edge not mistaken for Chrome", () =>
    expect(identify("Chrome/129.0 Safari/537.36 Edg/129.0").family).toBe(
      "Edge",
    ));
  it("iOS Firefox identified", () =>
    expect(identify("FxiOS/130.0 Safari/605.1").family).toBe("Firefox"));
  it("iPad identification remains cautious", () =>
    expect(platform("Macintosh")).toContain("iPad"));
  for (const payload of [
    { type: "eval" },
    null,
    { type: "VAREK_ACTION", name: "reader", arg: "anything" },
    { type: "VAREK_ACTION", name: "tabs", arg: "deleteAll" },
  ])
    it("reject invalid extension input " + JSON.stringify(payload), () =>
      expect(validExtensionRequest(payload)).toBe(false),
    );
  it("allows reader action only with no arguments", () =>
    expect(
      validExtensionRequest({ type: "VAREK_ACTION", name: "reader", arg: "" }),
    ).toBe(true));
});
describe("Flow paths", () => {
  for (const f of flows)
    for (const first of [true, false])
      for (const second of [true, false])
        it(`${f.id}/${first}/${second}`, () => {
          const start = flowReply(f.id, 0, first);
          expect(start.text.length).toBeGreaterThan(20);
          if (!start.done) {
            const end = flowReply(f.id, 1, second);
            expect(end.done).toBe(true);
            expect(end.text.length).toBeGreaterThan(20);
          }
        });
});
describe("Streaming", () => {
  it("preserves Unicode and cancels cleanly", async () => {
    const c = new AbortController();
    let output = "";
    const done = await stream(
      "🌿".repeat(100),
      (s) => {
        output = s;
        c.abort();
      },
      c.signal,
    );
    expect(done).toBe(false);
    expect(Array.from(output).every((x) => x === "🌿")).toBe(true);
    expect(output.length).toBeLessThan(200);
  });
  it("reduced motion completes without delays", async () => {
    let value = "";
    expect(
      await stream(
        "hello",
        (s) => (value = s),
        new AbortController().signal,
        true,
      ),
    ).toBe(true);
    expect(value).toBe("hello");
  });
});
