import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
export function Markdown({
  text,
  allowLinks = true,
}: {
  text: string;
  allowLinks?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
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
          return safe && allowLinks ? (
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
