import ReactMarkdown, { type Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const components: Components = {
  a({ href, children, ...props }) {
    const external = Boolean(href?.startsWith("http"));
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer noopener" : undefined}
        {...props}
      >
        {children}
      </a>
    );
  },
  img({ alt, src, ...props }) {
    return (
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        className="h-auto max-w-full rounded-xl border border-[var(--line)]"
        {...props}
      />
    );
  },
  table({ children, ...props }) {
    return (
      <div className="table-scroll" role="region" aria-label="教材表格，可水平捲動" tabIndex={0}>
        <table {...props}>{children}</table>
      </div>
    );
  },
};

export function LessonMarkdown({ content }: { content: string }) {
  return (
    <div className="lesson-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex, rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
