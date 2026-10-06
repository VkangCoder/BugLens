import type { BugEventType } from "@/types/session";
import { EVENT_META } from "@/utils/events";
import styles from "./EventTag.module.scss";

export default function EventTag({ type }: { type: BugEventType }) {
  const { label, icon: Icon, color } = EVENT_META[type];
  return (
    <span className={styles.tag} style={{ color }} title={label}>
      <Icon size={14} strokeWidth={1.5} />
      {label}
    </span>
  );
}
