import type { ReactNode } from "react";
import styles from "./Badge.module.scss";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  title?: string;
  children: ReactNode;
}

// Small status label (buglens-design feedback/Badge); the dot carries state, the text says which
export default function Badge({ tone = "neutral", dot = false, title, children }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`} title={title}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
