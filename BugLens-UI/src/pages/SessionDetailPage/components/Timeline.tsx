import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { BugEventType } from "@/types/session";
import { EVENT_META, EVENT_TYPES, formatOffset } from "@/utils/events";
import styles from "./Timeline.module.scss";

export interface TimelineItem {
  type: BugEventType;
  offset: number; // ms since session start
}

interface TimelineProps {
  items: TimelineItem[];
  duration: number;
  playhead: number;
  selected: number | null;
  onSeek: (ms: number) => void;
  onSelect: (index: number) => void;
}

export default function Timeline({
  items,
  duration,
  playhead,
  selected,
  onSeek,
  onSelect,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!trackRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  const total = Math.max(duration, 1000);
  const lanes = EVENT_TYPES.filter((type) =>
    items.some((item) => item.type === type),
  );
  const ticks = Math.max(1, Math.min(8, Math.floor(width / 90)));
  const percent = (ms: number) => `${Math.min(100, (ms / total) * 100)}%`;

  function seek(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(
      Math.max(
        0,
        Math.min(total, ((e.clientX - rect.left) / rect.width) * total),
      ),
    );
  }

  return (
    <div className={styles.timeline}>
      <div className={styles.labels}>
        {lanes.map((type) => (
          <div key={type} className={styles.label}>
            {EVENT_META[type].label}
          </div>
        ))}
      </div>

      <div ref={trackRef} className={styles.track} onClick={seek}>
        <div className={styles.ruler}>
          {Array.from({ length: ticks + 1 }, (_, i) => (
            <span
              key={i}
              className={styles.tick}
              style={{
                left: `${(i / ticks) * 100}%`,
                transform:
                  i === ticks
                    ? "translateX(-100%)"
                    : i
                      ? "translateX(-50%)"
                      : "none",
              }}
            >
              {formatOffset((total * i) / ticks).slice(0, 5)}
            </span>
          ))}
        </div>

        {lanes.map((type) => (
          <div key={type} className={styles.lane}>
            {items.map((item, index) =>
              item.type !== type ? null : (
                <span
                  key={index}
                  title={`${EVENT_META[type].label} · ${formatOffset(item.offset)}`}
                  className={`${styles.marker} ${type === "error" ? styles.markerError : ""} ${selected === index ? styles.markerSelected : ""}`}
                  style={{
                    left: percent(item.offset),
                    background: EVENT_META[type].color,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(index);
                  }}
                />
              ),
            )}
          </div>
        ))}

        <div className={styles.playhead} style={{ left: percent(playhead) }} />
      </div>
    </div>
  );
}
