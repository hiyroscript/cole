import ReactMarkdown from "react-markdown";
export function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      skipHtml
      components={{
        img: ({ alt }) => (
          <span>{alt ? `[Image: ${alt}]` : "[Image omitted]"}</span>
        ),
        a: ({ href, children }) => {
          let safe = false;
          try {
            safe = ["https:", "http:"].includes(new URL(href ?? "").protocol);
          } catch {
            /* reject malformed links */
          }
          return safe ? (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ) : (
            <span>{children}</span>
          );
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
