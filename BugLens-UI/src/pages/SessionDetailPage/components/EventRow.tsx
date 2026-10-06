import { useEffect, useRef } from "react";
import EventTag from "@/components/EventTag";
import MaskedValue from "@/components/MaskedValue";
import type { BugEvent } from "@/types/session";
import { describeEvent, formatOffset, isMasked } from "@/utils/events";
import styles from "./EventRow.module.scss";

interface EventRowProps {
  index: number; // 1-based, shown in the first column
  event: BugEvent;
  offset: number;
  selected: boolean;
  onClick: () => void;
}

export default function EventRow({ index, event, offset, selected, onClick }: EventRowProps) {
  const { target, detail } = describeEvent(event);
  const isError = event.type === "error";
  const ref = useRef<HTMLButtonElement>(null);

  // Keep the selected row visible while playing or stepping
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  return (
    <button
      ref={ref}
      type="button"
      className={`${styles.row} ${isError ? styles.error : ""} ${selected ? styles.selected : ""}`}
      onClick={onClick}
      aria-current={selected || undefined}
    >
      <span className={styles.index}>{index}</span>
      <span className={styles.offset}>{formatOffset(offset)}</span>
      <EventTag type={event.type} />
      <span className={styles.body}>
        <span className={styles.target}>{target}</span>
        {isMasked(event) ? <MaskedValue showReason={false} /> : detail && <span className={styles.detail}>{detail}</span>}
      </span>
    </button>
  );
}
