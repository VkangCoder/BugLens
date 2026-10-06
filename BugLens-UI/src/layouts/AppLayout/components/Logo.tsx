// BugLens mark (src/assets/logo/buglens-mark.svg) drawn inline so the line follows
// the text color and the dot follows the primary color in both themes.
const MARK_PATH =
  "M12 92C2 46 50 12 63 42C74 68 32 88 28 60C25 38 58 34 63 54C65 60 70 60 76 60L98 60";

export default function Logo({ size = 20, wordmark = true }: { size?: number; wordmark?: boolean }) {
  const small = size < 24; // heavier stroke so the mark stays legible when small
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.4) }}>
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <path
          d={MARK_PATH}
          stroke="currentColor"
          strokeWidth={small ? 9 : 6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="105" cy="60" r={small ? 9.5 : 7.5} fill="var(--ant-color-primary)" />
      </svg>
      {wordmark && (
      <span
        style={{
          fontWeight: 600,
          fontSize: Math.round(size * 0.8),
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        BugLens
      </span>
      )}
    </span>
  );
}
