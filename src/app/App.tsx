import { Welcome } from "../components/Welcome";
import { GammaSetup } from "../components/GammaSetup";
import { semantic } from "../core/gamma/semantic";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
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
import { activeModel, models, type ModelId } from "../core/models";
import { madon } from "../core/madon/runtime";
import { MODEL_VERSION } from "../core/madon/model-config";
import { MadonSetup } from "../components/MadonSetup";
import { parseCommand } from "../core/commands";
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
const logo = import.meta.env.BASE_URL + "logo.svg";
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
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 760px)");
    const changed = () => setMobile(media.matches);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  const [setupOpen, setSetupOpen] = useState(false);
  const [chats, setChats] = useState<Conversation[]>([]),
    [active, setActive] = useState<string>(),
    [ready, setReady] = useState(false),
    [prefs, setPrefs] = useState(preferences),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [sidebar, setSidebar] = useState(
      () => !matchMedia("(max-width: 760px)").matches,
    ),
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
  const model = activeModel(prefs.model);
  const modelState = useSyncExternalStore(madon.subscribe, madon.getSnapshot);
  function selectModel(id: ModelId) {
    if (busy) return;
    if (id === "gamma") madon.unload();
    setPrefs((p) => ({ ...p, model: id }));
    setModal(id === "madon" ? "models" : null);
  }
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
    const apply = () => {
      const theme = (document.documentElement.dataset.theme =
        prefs.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : prefs.theme);
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#101010" : "#F7F7F7");
    };
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
    if (!sidebar || !mobile) return;
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
  }, [sidebar, mobile]);
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
    if (mobile) setSidebar(false);
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
        if (mobile) setSidebar(false);
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
    const selected = activeModel(prefsRef.current.model);
    if (
      selected.id === "madon" &&
      !parseCommand(value) &&
      !value.trim().startsWith("/") &&
      modelState.state !== "ready"
    ) {
      setModal("models");
      return;
    }
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
        model: selected.id,
        modelVersion: selected.id === "madon" ? MODEL_VERSION : undefined,
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
      const response = await selected.generate(value, base.context, {
        thinking: prefsRef.current.thinking,
        facts: diagnose,
        device: prefsRef.current.device,
        extension: isExtension() ? extensionAction : undefined,
        stage: setStage,
        history: base.messages,
        webSources: prefsRef.current.webSources,
        enhanced: prefsRef.current.enhanced,
        signal,
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        onText: (text) => {
          if (run !== task.current || signal.aborted) return;
          chat = {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === assistant.id ? { ...m, text } : m,
            ),
          };
          setChats((prev) => prev.map((c) => (c.id === id ? chat : c)));
        },
      });
      if (run !== task.current) return;
      const complete = !signal.aborted;
      const { effect, ...content } = response;
      chat = {
        ...chat,
        context: complete ? response.context : base.context,
        messages: chat.messages.map((m) =>
          m.id === assistant.id
            ? {
                ...m,
                sources: complete ? content.sources : undefined,
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
        complete
          ? `${selected.name}’s response is ready.`
          : "Response stopped.",
      );
      if (complete && effect) {
        if (effect.type === "model") {
          if (effect.value === "unload") madon.unload();
          else if (effect.value === "gamma" || effect.value === "madon") {
            if (effect.value === "gamma") madon.unload();
            setPrefs((p) => ({ ...p, model: effect.value as ModelId }));
            if (effect.value === "madon") setModal("models");
          } else setModal("models");
        }
        if (effect.type === "web")
          setPrefs((p) => ({ ...p, webSources: effect.value === "on" }));
        if (effect.type === "enhance") {
          if (effect.value === "off") {
            semantic.disable();
            setPrefs((p) => ({ ...p, enhanced: false }));
          } else {
            setSetupOpen(true);
            setModal("settings");
          }
        }
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
        if (effect.type === "export") download(chat, "cole-conversation.json");
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
                stopped: signal.aborted,
                failure: signal.aborted
                  ? undefined
                  : e instanceof Error
                    ? e.message
                    : "Please try again.",
                text:
                  m.text ||
                  (signal.aborted
                    ? "Response stopped."
                    : "The operation could not be completed. See the error below and retry."),
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
                Cole
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
                    aria-current={c.id === active ? "page" : undefined}
                    disabled={busy}
                    onClick={() => {
                      setActive(c.id);
                      follow.current = true;
                      if (mobile) setSidebar(false);
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
              <button
                onClick={() => {
                  setSetupOpen(false);
                  setModal("settings");
                }}
              >
                <Settings size={17} /> Settings
              </button>
              <div className="local-note">
                <span className="status-dot" /> Local by design. Yours to keep.
              </div>
            </div>
          </aside>
        </>
      )}
      <main inert={sidebar && mobile}>
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
            <button
              className="model-top"
              disabled={busy}
              onClick={() => setModal("models")}
            >
              {model.name} <ChevronDown size={14} />
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
              onClick={() => void send("What is Cole?")}
              disabled={busy}
            >
              <Info size={18} />
            </button>
          </div>
        </header>
        <div
          className={
            "scroll-area" + (!current?.messages.length ? " is-welcome" : "")
          }
          ref={scrollRef}
          onScroll={() => {
            const e = scrollRef.current;
            if (e)
              follow.current =
                e.scrollHeight - e.scrollTop - e.clientHeight < 90;
          }}
        >
          {!current?.messages.length ? (
            <Welcome
              name={prefs.name}
              model={model.id}
              disabled={busy || !ready}
              send={(text) => void send(text)}
            />
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
                        <img src={logo} alt="" />{" "}
                        {activeModel(m.model ?? "gamma").name}
                      </>
                    ) : (
                      prefs.name || "You"
                    )}
                    {m.stopped && <span className="stopped">Stopped</span>}
                  </div>
                  {m.text ? (
                    <div className="prose">
                      <Markdown
                        text={m.text}
                        allowLinks={m.model !== "madon"}
                      />
                    </div>
                  ) : (
                    <div className="working">
                      {stage || "Preparing response"}
                      <span>…</span>
                    </div>
                  )}
                  {m.failure && (
                    <p role="alert" className="generation-error">
                      {m.failure}
                    </p>
                  )}
                  {!!m.sources?.length && (
                    <div className="sources">
                      <strong>Retrieved sources</strong>
                      <ul>
                        {m.sources.map((source) => (
                          <li key={source.url}>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {source.title}
                            </a>
                          </li>
                        ))}
                      </ul>
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
                    <details className="analysis" open={m.model === "madon"}>
                      <summary>
                        {m.model === "madon"
                          ? "Context & source notes"
                          : "Analysis summary"}
                      </summary>
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
          {model.id === "madon" && modelState.state !== "ready" && !busy && (
            <button className="model-status" onClick={() => setModal("models")}>
              Madon · {modelState.state} · Open setup
            </button>
          )}
          {model.id === "madon" && (
            <label className="web-sources">
              <input
                type="checkbox"
                checked={prefs.webSources}
                disabled={busy}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, webSources: e.target.checked }))
                }
              />{" "}
              Use web sources{" "}
              <small>
                Search terms go to Wikimedia. Inference stays local.
              </small>
            </label>
          )}
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
              Message {model.name}
            </label>
            <textarea
              id="composer"
              ref={composer}
              placeholder={
                model.id === "madon"
                  ? "Ask Madon…"
                  : "Ask Cole about your browser or device…"
              }
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
            Private by design. Processed on your device.
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
          {models.map((item) => (
            <button
              key={item.id}
              className="model-option"
              aria-pressed={model.id === item.id}
              disabled={busy}
              onClick={() => selectModel(item.id)}
            >
              <span className="model-letter">{item.name[0]}</span>
              <div>
                <h3>
                  {item.name}{" "}
                  <span>
                    {item.id === "madon"
                      ? isExtension()
                        ? "Website only"
                        : modelState.state === "ready"
                          ? "Ready"
                          : "Setup required · Preview"
                      : "Available"}
                  </span>
                </h3>
                <p>{item.description}</p>
              </div>
              {model.id === item.id && <Check size={18} />}
            </button>
          ))}
          {model.id === "madon" && (
            <MadonSetup
              busy={busy}
              switchToGamma={() => selectModel("gamma")}
            />
          )}
          <p className="fine-print">
            Gamma uses authored knowledge and browser diagnostics. Madon
            generates answers with a local language model.
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
                onClick={() => download(facts, "cole-diagnostics.json")}
              >
                <Download size={15} /> Export these observations
              </button>
            </>
          )}
        </Dialog>
      )}
      {modal === "settings" && (
        <Dialog title="Settings" close={() => setModal(null)}>
          <section className="settings-section">
            <h3>Preferences</h3>
            <label>
              Public web retrieval
              <input
                type="checkbox"
                checked={prefs.webSources}
                disabled={busy}
                onChange={(e) =>
                  setPrefs((p) => ({ ...p, webSources: e.target.checked }))
                }
              />
            </label>
            <p className="fine-print">
              Public topic queries go to Wikimedia. Gamma displays source
              extracts; Madon can use them in locally generated answers. Chats
              and diagnostics are not sent.
            </p>

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
                <option value="light">Light</option>
                <option value="dark">Dark</option>
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
          <details
            className="settings-disclosure"
            open={setupOpen}
            onToggle={(event) => setSetupOpen(event.currentTarget.open)}
          >
            <summary>
              Assistant setup <span>Gamma & Madon</span>
            </summary>
            <GammaSetup
              busy={busy}
              enabled={prefs.enhanced}
              change={(enhanced) => setPrefs((p) => ({ ...p, enhanced }))}
              clear={() => {
                if (current) persist({ ...current, context: emptyContext() });
                notify(
                  "Temporary context cleared. Saved messages are preserved.",
                );
              }}
            />

            <MadonSetup
              busy={busy}
              switchToGamma={() => selectModel("gamma")}
            />
          </details>
          <section className="settings-section">
            <h3>Your local data</h3>
            <p>
              Chats are saved in this browser’s IndexedDB. Preferences stay in
              local storage. No accounts, analytics, or remote inference.
              Exports and local storage are not encrypted by Cole.
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
                    "cole-conversations.json",
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
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Reset all preferences, including your name and device notes?",
                    )
                  ) {
                    madon.unload();
                    semantic.disable();
                    setPrefs({ ...defaults });
                  }
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
                      "Delete every Cole conversation and preference, and remove this app’s offline cache and both assistants’ model data?",
                    )
                  )
                    try {
                      if (!(await madon.remove()))
                        throw new Error("Model cache could not be cleared");
                      await semantic.remove();
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
                      {
                        madon.unload();
                        setPrefs({ ...defaults });
                      }
                      notify(
                        "Cole data cleared. Reload online to restore offline caching.",
                      );
                    } catch {
                      notify(
                        "Some data could not be cleared. Use browser site-data settings to finish.",
                      );
                    }
                }}
              >
                Clear all Cole data
              </button>
            </div>
          </section>
          <section className="settings-section">
            <h3>Offline & installation</h3>
            <p>
              After a successful cached visit, Gamma works offline. Use your
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
