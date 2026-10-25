import { ArrowRight, Globe, Monitor, Shield, Gauge } from "lucide-react";
const suggestions = [
  {
    icon: Globe,
    text: "What browser am I using?",
    label: "Your browser",
    detail: "Get to know your everyday tools",
  },
  {
    icon: Monitor,
    text: "Check my device information",
    label: "Your device",
    detail: "See what your browser can tell you",
  },
  {
    icon: Gauge,
    text: "Why is my browser slow?",
    label: "A smoother experience",
    detail: "Work through a performance issue",
  },
  {
    icon: Shield,
    text: "How can I improve my privacy?",
    label: "A little more privacy",
    detail: "Make informed browsing choices",
  },
];
export function Welcome({
  name,
  model,
  disabled,
  send,
}: {
  name: string;
  model: string;
  disabled: boolean;
  send: (text: string) => void;
}) {
  return (
    <section className="welcome">
      <img
        className="welcome-logo"
        src={import.meta.env.BASE_URL + "logo.svg"}
        alt="Cole"
      />
      <p className="eyebrow">Clarity, without the noise.</p>
      <h1>
        {name ? `${name}, where should we begin?` : "Where should we begin?"}
      </h1>
      <p className="welcome-description">
        {model === "madon"
          ? "Explore ideas with Madon, your optional local AI."
          : "Understand your browser. Get to know your device."}
        <br />A clearer answer starts with a question.
      </p>
      <div className="suggestions">
        {suggestions.map(({ icon: Icon, text, label, detail }) => (
          <button key={text} disabled={disabled} onClick={() => send(text)}>
            <Icon size={20} strokeWidth={1.5} />
            <span>
              {label}
              <small>{detail}</small>
            </span>
            <ArrowRight className="suggestion-arrow" size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}
