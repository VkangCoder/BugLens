import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./CodeBlock.module.scss";

// Pretty-printed JSON with colored keys / strings / numbers (buglens-design CodeBlock)
function renderValue(value: unknown, indent: number): ReactNode {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return <span className={styles.null}>null</span>;
  if (typeof value === "number" || typeof value === "boolean") return <span className={styles.number}>{String(value)}</span>;
  if (typeof value === "string") return <span className={styles.string}>{JSON.stringify(value)}</span>;

  const isArray = Array.isArray(value);
  const entries = isArray ? value.map((v, i) => [i, v] as const) : Object.entries(value as object);
  if (entries.length === 0) return isArray ? "[]" : "{}";

  return (
    <>
      {isArray ? "[" : "{"}
      {entries.map(([key, v], i) => (
        <span key={key}>
          {"\n"}
          {pad}
          {"  "}
          {!isArray && <span className={styles.key}>{JSON.stringify(key)}</span>}
          {!isArray && ": "}
          {renderValue(v, indent + 1)}
          {i < entries.length - 1 ? "," : ""}
        </span>
      ))}
      {"\n"}
      {pad}
      {isArray ? "]" : "}"}
    </>
  );
}

interface CodeBlockProps {
  title: string;
  data?: unknown; // rendered as colored JSON
  code?: string; // rendered as plain text (stack traces)
}

export default function CodeBlock({ title, data, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = code ?? JSON.stringify(data, null, 2);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={styles.block}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy ${title}`}>
          {copied ? <Check size={12} strokeWidth={1.5} /> : <Copy size={12} strokeWidth={1.5} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className={styles.code}>{code ?? renderValue(data, 0)}</pre>
    </div>
  );
}
