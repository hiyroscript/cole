import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  ArrowUp,
  ArrowRight,
  Plus,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeft,
  MessageSquare,
  Pin,
  Trash2,
  Pencil,
  Copy,
  RotateCcw,
  Square,
  ChevronDown,
  Check,
  Monitor,
  Shield,
  Globe,
  Command,
  Download,
  WifiOff,
  Info,
} from "lucide-react";
import {
  emptyContext,
  type Conversation,
  type Message,
  type Preferences,
  type Evidence,
} from "../core/types";
import { activeModel } from "../core/models";
import { stream } from "../core/stream";
import { commands } from "../core/commands";
import { diagnose } from "../lib/diagnostics";
import {
  clearConversations,
  defaults,
  deleteConversation,
  download,
  loadConversations,
  preferences,
  putConversation,
  savePreferences,
} from "../lib/storage";
import { isExtension, extensionAction } from "../lib/extension";
import { Markdown } from "../components/Markdown";
import { Dialog } from "../components/Dialog";
const logo = import.meta.env.BASE_URL + "logo.jpg";
const suggestions = [
  { icon: Globe, text: "What browser am I using?", label: "Know your browser" },
  {
    icon: Monitor,
    text: "Check my device information",
    label: "Understand your device",
  },
  {
    icon: ArrowRight,
    text: "Why is my browser slow?",
    label: "Find a way forward",
  },
  {
    icon: Shield,
    text: "How can I improve my privacy?",
    label: "Make browsing more private",
  },
];
function EvidenceView({ facts }: { facts: Evidence[] }) {
  const [status, setStatus] = useState("");
  return (
    <div className="evidence">
      {facts.map((f, i) => (
        <div className="fact" key={i}>
          <span>
            {f.label}
            <small>{f.kind}</small>
          </span>
          <code>{f.value}</code>
          <button
            className="icon"
            aria-label={"Copy " + f.label}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(f.value);
                setStatus(f.label + " copied.");
              } catch {
                setStatus(
                  "Clipboard access denied. Select the value to copy it.",
                );
              }
            }}
          >
            <Copy size={12} />
          </button>
        </div>
      ))}
      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  );
}

export default function App() {
  const [chats, setChats] = useState<Conversation[]>([]),
    [active, setActive] = useState<string>(),
    [ready, setReady] = useState(false),
    [prefs, setPrefs] = useState(preferences),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [sidebar, setSidebar] = useState(() => innerWidth > 760),
    [search, setSearch] = useState(""),
    [modal, setModal] = useState<"settings" | "diagnostics" | "models" | null>(
      null,
    ),
    [facts, setFacts] = useState<Evidence[]>([]),
    [notice, setNotice] = useState(""),
    [announcement, setAnnouncement] = useState(""),
    [menuIndex, setMenuIndex] = useState(0),
    [menuDismissed, setMenuDismissed] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [update, setUpdate] = useState<ServiceWorkerRegistration>();
  const asideRef = useRef<HTMLElement>(null),
    composer = useRef<HTMLTextAreaElement>(null),
    searchRef = useRef<HTMLInputElement>(null),
    scrollRef = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    controller = useRef<AbortController | null>(null),
    task = useRef(0),
    chatRef = useRef(chats),
    prefsRef = useRef(prefs);
  chatRef.current = chats;
  prefsRef.current = prefs;
  const current = chats.find((c) => c.id === active);
  const matches = commands.filter((c) =>
    c.name.startsWith(input.slice(1).split(" ")[0]),
  );
  const menu =
    input.startsWith("/") &&
    !input.includes(" ") &&
    !menuDismissed &&
    matches.length > 0;
  const notify = (s: string) => setNotice(s);
  useEffect(() => {
    loadConversations()
      .then((c) => {
        setChats(c);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        notify(
          "Browser storage is unavailable. This session works, but chats may not survive a reload.",
        );
      });
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    try {
      savePreferences(prefs);
    } catch {
      notify("Preferences could not be saved. Storage may be blocked or full.");
    }
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [prefs]);
  useEffect(() => {
    const changed = () => setOnline(navigator.onLine);
    addEventListener("online", changed);
    addEventListener("offline", changed);
    const event = (e: Event) =>
      setUpdate((e as CustomEvent<ServiceWorkerRegistration>).detail);
    addEventListener("varek-update", event);
    return () => {
      removeEventListener("online", changed);
      removeEventListener("offline", changed);
      removeEventListener("varek-update", event);
    };
  }, []);
  useEffect(() => {
    if (!sidebar || innerWidth > 760) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () =>
      Array.from(
        asideRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a,input",
        ) ?? [],
      );
    items()[0]?.focus();
    const trap = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = items();
      const first = list[0],
        last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [sidebar]);
  useEffect(() => {
    if (menu)
      document
        .getElementById("command-" + menuIndex)
        ?.scrollIntoView({ block: "nearest" });
  }, [menuIndex, menu]);
  useEffect(() => {
    if (composer.current) {
      composer.current.style.height = "auto";
      composer.current.style.height =
        Math.min(composer.current.scrollHeight, 180) + "px";
    }
    setMenuIndex(0);
  }, [input]);
  useEffect(() => {
    if (current?.messages.length && follow.current && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [current?.messages]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(t);
  }, [notice]);
  function persist(chat: Conversation) {
    setChats((prev) => {
      const exists = prev.some((c) => c.id === chat.id);
      const next = exists
        ? prev.map((c) => (c.id === chat.id ? chat : c))
        : [chat, ...prev];
      chatRef.current = next;
      return next;
    });
    void putConversation(chat).catch(() =>
      notify("Chat could not be saved. Export it before closing this page."),
    );
  }
  function stop() {
    controller.current?.abort();
  }
  function newChat() {
    if (busy) return;
    setActive(undefined);
    setInput("");
    setMenuDismissed(false);
    if (innerWidth <= 760) setSidebar(false);
    composer.current?.focus();
  }
  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.key.toLowerCase() === "n") {
          e.preventDefault();
          newChat();
        }
        if (e.key.toLowerCase() === "k") {
          e.preventDefault();
          composer.current?.focus();
        }
        if (e.key.toLowerCase() === "b") {
          e.preventDefault();
          setSidebar((s) => !s);
        }
        if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          setSidebar(true);
          setTimeout(() => searchRef.current?.focus(), 0);
        }
      }
      if (e.key === "Escape") {
        setMenuDismissed(true);
        if (innerWidth <= 760) setSidebar(false);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [busy]);
  async function remove(id: string) {
    if (
      busy ||
      !confirm(
        "Delete this conversation from this browser? This cannot be undone.",
      )
    )
      return;
    try {
      await deleteConversation(id);
      setChats((c) => c.filter((x) => x.id !== id));
      if (active === id) setActive(undefined);
    } catch {
      notify("Could not delete the conversation.");
    }
  }
  async function send(value = input, retry = false) {
    if (!value.trim() || busy || !ready) return;
    const id = current?.id ?? crypto.randomUUID();
    let base = current ?? {
      id,
      title: value.trim().replace(/\s+/g, " ").slice(0, 55),
      pinned: false,
      updated: Date.now(),
      messages: [],
      context: emptyContext(),
    };
    if (retry) {
      const last = base.messages.findLastIndex((m) => m.role === "user");
      base = {
        ...base,
        messages: base.messages.slice(0, last),
        context: base.messages[last]?.contextBefore ?? emptyContext(),
      };
    }
    const user: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: value.trim(),
        contextBefore: base.context,
      },
      assistant: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "",
      };
    let chat: Conversation = {
      ...base,
      updated: Date.now(),
      messages: [...base.messages, user, assistant],
    };
    const run = ++task.current;
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setBusy(true);
    setActive(id);
    setInput("");
    setMenuDismissed(false);
    follow.current = true;
    persist(chat);
    try {
      const response = await activeModel().engine(value, base.context, {
        thinking: prefsRef.current.thinking,
        facts: diagnose,
        device: prefsRef.current.device,
        extension: isExtension() ? extensionAction : undefined,
        stage: setStage,
      });
      if (run !== task.current) return;
      const complete = await stream(
        response.text,
        (text) => {
          chat = {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === assistant.id ? { ...m, text } : m,
            ),
          };
          setChats((prev) => prev.map((c) => (c.id === id ? chat : c)));
        },
        signal,
        matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
      const { effect, ...content } = response;
      chat = {
        ...chat,
        context: complete ? response.context : base.context,
        messages: chat.messages.map((m) =>
          m.id === assistant.id
            ? {
                ...m,
                evidence: complete ? content.evidence : undefined,
                analysis: complete ? content.analysis : undefined,
                followups: complete ? content.followups : undefined,
                stopped: !complete,
                text: m.text || "Response stopped.",
              }
            : m,
        ),
      };
      persist(chat);
      setAnnouncement(
        complete ? "Zulvyn’s response is ready." : "Response stopped.",
      );
      if (complete && effect) {
        if (effect.type === "theme")
          setPrefs((p) => ({
            ...p,
            theme: effect.value as Preferences["theme"],
          }));
        if (effect.type === "think")
          setPrefs((p) => ({
            ...p,
            thinking: effect.value as Preferences["thinking"],
          }));
        if (effect.type === "export") download(chat, "varek-conversation.json");
        if (effect.type === "new") setActive(undefined);
        if (
          effect.type === "clear" &&
          confirm("Clear all messages in this conversation?")
        )
          persist({ ...chat, messages: [], context: emptyContext() });
      }
    } catch (e) {
      chat = {
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === assistant.id
            ? {
                ...m,
                text: `I couldn’t complete that operation. ${e instanceof Error ? e.message : "Please try again."}`,
              }
            : m,
        ),
      };
      persist(chat);
      setAnnouncement("The operation could not be completed.");
    } finally {
      if (run === task.current) {
        setBusy(false);
        setStage("");
        composer.current?.focus();
      }
    }
  }
  function keydown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.nativeEvent.isComposing) return;
    if (menu && ["ArrowDown", "ArrowUp", "Tab", "Enter"].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowDown") setMenuIndex((i) => (i + 1) % matches.length);
      else if (e.key === "ArrowUp")
        setMenuIndex((i) => (i - 1 + matches.length) % matches.length);
      else {
        setInput(
          "/" +
            matches[menuIndex].name +
            (matches[menuIndex].args.length ? " " : ""),
        );
        setMenuDismissed(true);
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }
  async function diagnostics() {
    setModal("diagnostics");
    setFacts([]);
    try {
      setFacts(await diagnose());
    } catch {
      notify("Some browser information could not be read.");
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard.");
    } catch {
      notify(
        "Clipboard access was denied. Select the response text to copy it manually.",
      );
    }
  }
  const ordered = [...chats]
    .sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated,
    )
    .filter((c) =>
      (c.title + " " + c.messages.map((m) => m.text).join(" "))
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  return (
    <div className={"app " + (sidebar ? "sidebar-open" : "sidebar-closed")}>
      <a className="skip" href="#composer">
        Skip to composer
      </a>
      {sidebar && (
        <>
          <button
            className="drawer-backdrop"
            aria-label="Close navigation"
            onClick={() => setSidebar(false)}
          />
          <aside ref={asideRef} aria-label="Conversations">
            <div className="brand-row">
              <a
                className="brand"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  newChat();
                }}
              >
                <img src={logo} alt="" />
                Varek
              </a>
              <button
                className="icon"
                onClick={() => setSidebar(false)}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </div>
            <button className="new-chat" onClick={newChat} disabled={busy}>
              <Plus size={17} /> New conversation <kbd>⌥ N</kbd>
            </button>
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef}
                placeholder="Search conversations"
                aria-label="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="history">
              <p className="eyebrow">Your conversations</p>
              {!ordered.length && (
                <p className="empty-history">
                  {search
                    ? "No matching conversations."
                    : "A little space for your next thought."}
                </p>
              )}
              {ordered.map((c) => (
                <div
                  className={"chat-link " + (c.id === active ? "selected" : "")}
                  key={c.id}
                >
                  <button
                    className="chat-select"
                    disabled={busy}
                    onClick={() => {
                      setActive(c.id);
                      follow.current = true;
                      if (innerWidth <= 760) setSidebar(false);
                    }}
                  >
                    {c.pinned ? <Pin size={14} /> : <MessageSquare size={14} />}
                    <span>{c.title}</span>
                  </button>
                  <div className="chat-actions">
                    <button
                      disabled={busy}
                      aria-label={"Rename " + c.title}
                      onClick={() => {
                        const title = prompt("Conversation name", c.title);
                        if (title?.trim())
                          persist({ ...c, title: title.trim().slice(0, 100) });
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      disabled={busy}
                      aria-label={(c.pinned ? "Unpin " : "Pin ") + c.title}
                      onClick={() => persist({ ...c, pinned: !c.pinned })}
                    >
                      <Pin size={13} />
                    </button>
                    <button
                      disabled={busy}
                      aria-label={"Delete " + c.title}
                      onClick={() => void remove(c.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="sidebar-footer">
              <button onClick={() => void diagnostics()}>
                <Monitor size={17} /> Browser & device
              </button>
              <button onClick={() => setModal("settings")}>
                <Settings size={17} /> Settings
              </button>
              <div className="local-note">
                <span className="status-dot" /> Local by design. Yours to keep.
              </div>
            </div>
          </aside>
        </>
      )}
      <main inert={sidebar && innerWidth <= 760}>
        <header className="topbar">
          <div>
            {!sidebar && (
              <button
                className="icon"
                onClick={() => setSidebar(true)}
                aria-label="Open sidebar"
              >
                <PanelLeft size={19} />
              </button>
            )}
            <button className="model-top" onClick={() => setModal("models")}>
              Zulvyn <ChevronDown size={14} />
            </button>
            <span className="top-subtitle">Local intelligence</span>
          </div>
          <div>
            {!online && (
              <span className="offline">
                <WifiOff size={14} /> Offline
              </span>
            )}
            {update && (
              <button
                disabled={busy}
                onClick={() => {
                  update.waiting?.postMessage({ type: "SKIP_WAITING" });
                }}
              >
                Update ready · Reload
              </button>
            )}
            <button
              className="icon"
              aria-label="About local processing"
              onClick={() => void send("What is Varek?")}
              disabled={busy}
            >
              <Info size={18} />
            </button>
          </div>
        </header>
        <div
          className="scroll-area"
          ref={scrollRef}
          onScroll={() => {
            const e = scrollRef.current;
            if (e)
              follow.current =
                e.scrollHeight - e.scrollTop - e.clientHeight < 90;
          }}
        >
          {!current?.messages.length ? (
            <section className="welcome">
              <img className="welcome-logo" src={logo} alt="Varek" />
              <p className="eyebrow">A clearer view, right here.</p>
              <h1>
                {prefs.name
                  ? `${prefs.name}, where should we begin?`
                  : "Where should we begin?"}
              </h1>
              <p className="welcome-description">
                Your browser, your device, a little more understood.
                <br />
                Ask Zulvyn. Everything is processed locally.
              </p>
              <div className="suggestions">
                {suggestions.map(({ icon: Icon, text, label }) => (
                  <button
                    key={text}
                    disabled={busy || !ready}
                    onClick={() => void send(text)}
                  >
                    <Icon size={18} />
                    <span>
                      {label}
                      <small>{text}</small>
                    </span>
                    <ArrowRight className="suggestion-arrow" size={15} />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div
              className="messages"
              aria-label="Conversation"
              aria-busy={busy}
            >
              {current.messages.map((m, i) => (
                <article key={m.id} className={"message " + m.role}>
                  <div className="message-label">
                    {m.role === "assistant" ? (
                      <>
                        <img src={logo} alt="" /> Zulvyn
                      </>
                    ) : (
                      prefs.name || "You"
                    )}
                    {m.stopped && <span className="stopped">Stopped</span>}
                  </div>
                  {m.text ? (
                    <div className="prose">
                      <Markdown text={m.text} />
                    </div>
                  ) : (
                    <div className="working">
                      {stage || "Preparing response"}
                      <span>…</span>
                    </div>
                  )}
                  {m.evidence && m.evidence.length > 0 && (
                    <details className="evidence-details" open>
                      <summary>
                        Browser evidence <span>{m.evidence.length} fields</span>
                      </summary>
                      <EvidenceView facts={m.evidence} />
                    </details>
                  )}
                  {m.analysis && (
                    <details className="analysis">
                      <summary>Analysis summary</summary>
                      <ul>
                        {m.analysis.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {m.role === "assistant" && m.text && (
                    <div className="message-actions">
                      <button
                        className="icon"
                        aria-label="Copy response"
                        onClick={() => void copy(m.text)}
                      >
                        <Copy size={14} />
                      </button>
                      {i === current.messages.length - 1 && (
                        <button
                          className="icon"
                          disabled={busy}
                          aria-label="Regenerate response"
                          onClick={() => {
                            const q = current.messages.findLast(
                              (x) => x.role === "user",
                            );
                            if (q) void send(q.text, true);
                          }}
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {m.followups &&
                    i === current.messages.length - 1 &&
                    !busy && (
                      <div className="followups">
                        {m.followups.map((s) => (
                          <button key={s} onClick={() => void send(s)}>
                            {s}
                            <ArrowRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                </article>
              ))}
            </div>
          )}
        </div>
        <div className="composer-area">
          <div className="composer-box">
            {menu && (
              <div
                className="command-menu"
                role="listbox"
                aria-label="Slash commands"
                id="commands"
              >
                {matches.map((c, i) => (
                  <button
                    key={c.name}
                    id={"command-" + i}
                    role="option"
                    aria-selected={i === menuIndex}
                    className={i === menuIndex ? "active" : ""}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setInput("/" + c.name + (c.args.length ? " " : ""));
                      setMenuDismissed(true);
                      composer.current?.focus();
                    }}
                  >
                    <strong>/{c.name}</strong>
                    <span>{c.description}</span>
                  </button>
                ))}
              </div>
            )}
            <label className="sr-only" htmlFor="composer">
              Message Zulvyn
            </label>
            <textarea
              id="composer"
              ref={composer}
              placeholder="Ask about your browser or device…"
              value={input}
              maxLength={20000}
              disabled={!ready || busy}
              aria-controls={menu ? "commands" : undefined}
              aria-activedescendant={menu ? "command-" + menuIndex : undefined}
              onChange={(e) => {
                setInput(e.target.value);
                setMenuDismissed(false);
              }}
              onKeyDown={keydown}
              rows={1}
            />
            <div className="composer-tools">
              <div>
                <button
                  className="command-trigger"
                  aria-label="Open command menu"
                  disabled={busy}
                  onClick={() => {
                    setInput("/");
                    setMenuDismissed(false);
                    composer.current?.focus();
                  }}
                >
                  <Command size={15} />
                  <span>Commands</span>
                </button>
                <span className="tool-divider" />
                <label className="thinking-label">
                  Thinking{" "}
                  <select
                    aria-label="Thinking mode"
                    value={prefs.thinking}
                    onChange={(e) =>
                      setPrefs((p) => ({
                        ...p,
                        thinking: e.target.value as Preferences["thinking"],
                      }))
                    }
                  >
                    <option value="auto">Auto</option>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>
              </div>
              {busy ? (
                <button
                  className="send"
                  onClick={stop}
                  aria-label="Stop response"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  className="send"
                  disabled={!input.trim() || !ready}
                  onClick={() => void send()}
                  aria-label="Send message"
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </div>
          </div>
          <p className="composer-note">
            Local knowledge. Real browser signals. No remote AI.
            <span>Enter to send · Shift + Enter for a new line</span>
          </p>
        </div>
      </main>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      {modal === "models" && (
        <Dialog title="Your intelligence" close={() => setModal(null)}>
          <div className="model-option">
            <img src={logo} alt="" />
            <div>
              <h3>
                Zulvyn <span>Available</span>
              </h3>
              <p>Local browser and device intelligence.</p>
            </div>
            <Check size={18} />
          </div>
          <button
            className="model-option future"
            onClick={() =>
              notify("Madon is not available yet. Zulvyn remains active.")
            }
          >
            <span className="model-letter">M</span>
            <div>
              <h3>
                Madon <span>Coming soon</span>
              </h3>
              <p>Advanced intelligence. Not available yet.</p>
            </div>
          </button>
          <p className="fine-print">
            Zulvyn combines authored knowledge, local matching, and browser
            diagnostics. It is not a large language model.
          </p>
        </Dialog>
      )}
      {modal === "diagnostics" && (
        <Dialog title="Browser & device" close={() => setModal(null)}>
          <p className="dialog-intro">
            Available signals from this browser. Nothing here measures
            operating-system activity or exact hardware utilization.
          </p>
          {!facts.length ? (
            <p>Checking available information…</p>
          ) : (
            <>
              {[
                "Browser",
                "Device",
                "Display",
                "Network",
                "Storage",
                "Permissions",
              ].map((group) => (
                <section key={group}>
                  <h3>{group}</h3>
                  <EvidenceView
                    facts={facts.filter((f) => f.group === group)}
                  />
                </section>
              ))}
              <button
                className="secondary"
                onClick={() => download(facts, "varek-diagnostics.json")}
              >
                <Download size={15} /> Export these observations
              </button>
            </>
          )}
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog title="Make it your space" close={() => setModal(null)}>
          <section className="settings-section">
            <h3>Preferences</h3>
            <label>
              Appearance
              <select
                value={prefs.theme}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    theme: e.target.value as Preferences["theme"],
                  }))
                }
              >
                <option value="light">Light · Porcelain</option>
                <option value="dark">Dark · Ink</option>
                <option value="system">Follow system</option>
              </select>
            </label>
            <label>
              Your name{" "}
              <input
                maxLength={80}
                placeholder="Optional"
                value={prefs.name}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, name: e.target.value }))
                }
              />
            </label>
            <label>
              Device notes{" "}
              <textarea
                maxLength={1000}
                placeholder="Optional, user-provided information"
                value={prefs.device}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, device: e.target.value }))
                }
              />
            </label>
            <button
              className="text-button"
              onClick={() => {
                if (confirm("Clear your saved device information?"))
                  setPrefs((p) => ({ ...p, device: "" }));
              }}
            >
              Clear device notes
            </button>
          </section>
          <section className="settings-section">
            <h3>Your local data</h3>
            <p>
              Chats are saved in this browser’s IndexedDB. Preferences stay in
              local storage. No accounts, analytics, or remote inference.
              Exports and local storage are not encrypted by Varek.
            </p>
            <div className="settings-buttons">
              <button
                onClick={() =>
                  download(
                    {
                      schema: 1,
                      exported: new Date().toISOString(),
                      conversations: chats,
                    },
                    "varek-conversations.json",
                  )
                }
              >
                <Download size={15} /> Export all conversations
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  if (
                    confirm("Delete all conversations? This cannot be undone.")
                  )
                    try {
                      await clearConversations();
                      setChats([]);
                      setActive(undefined);
                    } catch {
                      notify("Unable to clear conversations.");
                    }
                }}
              >
                Delete all conversations
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Reset all preferences, including your name and device notes?",
                    )
                  )
                    setPrefs({ ...defaults });
                }}
              >
                Reset preferences
              </button>
              <button
                className="danger"
                disabled={busy}
                onClick={async () => {
                  if (
                    confirm(
                      "Delete every Varek conversation and preference, and remove this app’s offline cache?",
                    )
                  )
                    try {
                      await clearConversations();
                      localStorage.removeItem("varek.preferences.v1");
                      if ("caches" in window)
                        for (const key of await caches.keys())
                          if (key.startsWith("varek-"))
                            await caches.delete(key);
                      if ("serviceWorker" in navigator)
                        for (const reg of await navigator.serviceWorker.getRegistrations())
                          if (
                            reg.scope ===
                            new URL(import.meta.env.BASE_URL, location.href)
                              .href
                          )
                            await reg.unregister();
                      setChats([]);
                      setActive(undefined);
                      setPrefs({ ...defaults });
                      notify(
                        "Varek data cleared. Reload online to restore offline caching.",
                      );
                    } catch {
                      notify(
                        "Some data could not be cleared. Use browser site-data settings to finish.",
                      );
                    }
                }}
              >
                Clear all Varek data
              </button>
            </div>
          </section>
          <section className="settings-section">
            <h3>Offline & installation</h3>
            <p>
              After a successful cached visit, Zulvyn works offline. Use your
              browser’s Install or Add to Home Screen control where supported.
              For the Chromium extension, download the build artifact from
              GitHub Actions and load its extracted folder through the extension
              manager.
            </p>
            <a
              href="https://github.com/hiyroscript/varek"
              target="_blank"
              rel="noreferrer"
            >
              Source, documentation & extension builds ↗
            </a>
          </section>
        </Dialog>
      )}
    </div>
  );
}
