import styles from "./StatusBadge.module.scss";

// "Error" (red dot) when the session has errors, otherwise "Recorded"
export default function StatusBadge({ errorCount }: { errorCount: number }) {
  const isError = errorCount > 0;
  return (
    <span className={`${styles.badge} ${isError ? styles.danger : ""}`}>
      <span className={styles.dot} />
      {isError ? "Error" : "Recorded"}
    </span>
  );
}
