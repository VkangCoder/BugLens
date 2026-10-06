import { Lock } from "lucide-react";
import styles from "./MaskedValue.module.scss";

export default function MaskedValue({ showReason = true }: { showReason?: boolean }) {
  return (
    <span className={styles.masked} title="Value masked — never stored">
      <Lock size={12} strokeWidth={1.5} />
      <span className={styles.dots}>••••••••</span>
      {showReason && <span className={styles.reason}>masked</span>}
    </span>
  );
}
