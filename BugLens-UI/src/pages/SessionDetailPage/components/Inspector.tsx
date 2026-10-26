import CodeBlock from "@/components/CodeBlock";
import EventTag from "@/components/EventTag";
import MaskedValue from "@/components/MaskedValue";
import type { BugEvent } from "@/types/session";
import { formatOffset, isMasked } from "@/utils/events";
import { formatDateTime } from "@/utils/format";
import { App, Button, Tooltip, Typography } from "antd";
import { ChevronDown, ChevronUp, Link2, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import styles from "./Inspector.module.scss";

const ICON = { size: 14 };

// Key/value rows shown for each event type
function fieldsOf(event: BugEvent): [string, ReactNode][] {
  switch (event.type) {
    case "click":
      return [
        ["Selector", event.data.selector ?? event.data.tagName],
        ["Text", event.data.text || "—"],
        ["Position", event.data.x !== undefined ? `${event.data.x}, ${event.data.y}` : "—"],
      ];
    case "input":
      return [
        ["Selector", event.data.selector],
        ["Type", event.data.inputType],
        ["Value", event.data.masked ? <MaskedValue /> : event.data.value || "—"],
      ];
    case "navigation":
      return [
        ["Kind", event.data.kind],
        ["From", event.data.from || "—"],
        ["To", event.data.to],
      ];
    case "network":
      return [
        ["Request", `${event.data.method} ${event.data.url}`],
        ["Status", event.data.status || "failed"],
        ["Duration", `${event.data.duration} ms`],
        ...(event.data.error ? ([["Error", event.data.error]] as [string, ReactNode][]) : []),
      ];
    case "console":
      return [
        ["Level", event.data.level],
        ["Message", event.data.message],
      ];
    case "error":
      return [
        ["Kind", event.data.kind],
        ["Message", event.data.message],
        ...(event.data.source
          ? ([
              ["Source", `${event.data.source}${event.data.line ? `:${event.data.line}:${event.data.column}` : ""}`],
            ] as [string, ReactNode][])
          : []),
      ];
  }
}

interface InspectorProps {
  event: BugEvent;
  index: number;
  offset: number;
}

export default function Inspector({ event, index, offset }: InspectorProps) {
  const [expanded, setExpanded] = useState(false);
  const { message } = App.useApp();
  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("event", String(index + 1));
    await navigator.clipboard.writeText(url.toString());
    message.success("Link to event copied.");
  }

  const isError = event.type === "error";

  return (
    <aside className={styles.inspector}>
      <header className={styles.header}>
        <EventTag type={event.type} />
        <span className={styles.number}>#{index + 1}</span>
        <span className={styles.spacer} />
        <Tooltip placement='left' title='Copy link to event'>
          <Button
            type='text'
            size='small'
            icon={<Link2 size={14} strokeWidth={1.5} />}
            onClick={copyLink}
            aria-label='Copy link to event'
          />
        </Tooltip>
      </header>

      <div className={styles.body}>
        <dl className={styles.fields}>
          <dt>Offset</dt>
          <dd className={styles.mono}>{formatOffset(offset)}</dd>
          <dt>Time</dt>
          <dd>{formatDateTime(event.timestamp)}</dd>
          <dt>Page</dt>
          <dd className={styles.mono}>
            <Typography.Paragraph
              ellipsis={{
                rows: 1,
                expandable: "collapsible",
                expanded,
                symbol: (
                  <Tooltip
                    key={String(expanded)}
                    title={expanded ? "Collapse" : "Expand"}
                    trigger='hover'
                    mouseLeaveDelay={0}
                  >
                    {expanded ? <ChevronUp {...ICON} /> : <ChevronDown {...ICON} />}
                  </Tooltip>
                ),
                onExpand: (_, info) => {
                  setExpanded(info.expanded);
                },
              }}
            >
              {event.url}
            </Typography.Paragraph>
          </dd>
          {fieldsOf(event).map(([label, value]) => (
            <FieldRow key={label} label={label} value={value} danger={isError && label === "Message"} />
          ))}
        </dl>

        {event.type === "error" && event.data.stack ? (
          <CodeBlock title='stack trace' code={event.data.stack} />
        ) : (
          <CodeBlock title='payload' data={event.data} />
        )}

        {isMasked(event) && (
          <p className={styles.note}>
            <ShieldCheck size={14} strokeWidth={1.5} />
            Masked in the browser before upload. The value was never stored.
          </p>
        )}
      </div>
    </aside>
  );
}

function FieldRow({ label, value, danger }: { label: string; value: ReactNode; danger?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <dt>{label}</dt>
      <dd className={`${styles.mono} ${danger ? styles.danger : ""}`}>
        <Typography.Paragraph
          ellipsis={{
            rows: 1,
            expandable: "collapsible",
            expanded,
            symbol: (
              <Tooltip
                key={String(expanded)}
                title={expanded ? "Collapse" : "Expand"}
                trigger='hover'
                mouseLeaveDelay={0}
              >
                {expanded ? <ChevronUp {...ICON} /> : <ChevronDown {...ICON} />}
              </Tooltip>
            ),
            onExpand: (_, info) => {
              setExpanded(info.expanded);
            },
          }}
        >
          {value}
        </Typography.Paragraph>
      </dd>
    </>
  );
}
