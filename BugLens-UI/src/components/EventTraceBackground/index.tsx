import type { BugEventType } from "@/types/session";
import { EVENT_META } from "@/utils/events";
import { MousePointer2 } from "lucide-react";
import styles from "./EventTraceBackground.module.scss";

const WIDTH = 1600;
const HEIGHT = 900;
const LANE_COUNT = 9;
const LANE_TOP = 110;
const LANE_GAP = 85;

// Xung chạy ngang mỗi lane: translateX từ PULSE_FROM đến PULSE_TO (khớp keyframes `pulse-travel`).
// Đầu xung (đỉnh gradient, offset 0.85 của rect rộng 260) nằm ở translateX + PULSE_HEAD.
const PULSE_FROM = -300;
const PULSE_TO = 1900;
const PULSE_HEAD = 221;

// Chuột đi vòng qua các icon click: dừng HOLD giây ở mỗi icon, rồi LEG giây để tới icon kế tiếp.
const TOUR_CLICKS = 6;
const SAFE_MARGIN = 150; // viewBox bị crop ngang khi tỷ lệ màn hình hẹp hơn 16:9
const HOLD = 0.6;
const LEG = 4.6;
const PRESS_AT = 0.12; // giây sau khi tới nơi thì "bấm"

type MarkerType = Exclude<BugEventType, "error">;

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Lane {
  y: number;
  ticks: string;
  pulseDuration: number;
  pulseDelay: number;
}

interface Marker {
  id: string;
  type: MarkerType;
  x: number;
  y: number;
  glowDuration: number;
  glowDelay: number;
  tourIndex: number;
}

interface ErrorMarker {
  x: number;
  y: number;
  delay: number;
}

interface TourStop {
  x: number;
  y: number;
  arriveAt: number;
  midX: number;
  midY: number;
}

function repeat<T>(value: T, count: number): T[] {
  return Array.from({ length: count }, () => value);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function edgeness(x: number, y: number): number {
  return Math.hypot((x - WIDTH / 2) / (WIDTH * 0.6), (y - HEIGHT / 2) / (HEIGHT * 0.55));
}

function buildTrace() {
  const random = mulberry32(20261026);
  const lanes: Lane[] = [];

  for (let i = 0; i < LANE_COUNT; i++) {
    const y = LANE_TOP + i * LANE_GAP;
    let x = random() * 60;
    let d = "";
    while (x < WIDTH) {
      const burst = random() < 0.35;
      const half = burst ? 3 + random() * 7 : 2 + random() * 4;
      d += `M${x.toFixed(1)} ${(y - half).toFixed(1)}V${(y + half).toFixed(1)}`;
      x += burst ? 8 + random() * 22 : 40 + random() * 110;
    }
    lanes.push({ y, ticks: d, pulseDuration: 16 + random() * 14, pulseDelay: -random() * 30 });
  }

  const errors: ErrorMarker[] = [
    { x: 250, y: lanes[2].y, delay: 0 },
    { x: 1320, y: lanes[6].y, delay: -1.6 },
  ];

  const bag = shuffle<MarkerType>(
    [
      ...repeat<MarkerType>("click", 10),
      ...repeat<MarkerType>("input", 4),
      ...repeat<MarkerType>("navigation", 4),
      ...repeat<MarkerType>("network", 4),
      ...repeat<MarkerType>("console", 4),
    ],
    random,
  );

  const slotWidth = WIDTH / 3;
  const raw: Omit<Marker, "tourIndex" | "glowDuration" | "glowDelay">[] = [];
  let bagIndex = 0;

  for (const [laneIndex, lane] of lanes.entries()) {
    const slots = laneIndex === LANE_COUNT - 1 ? 2 : 3;
    for (let slot = 0; slot < slots && bagIndex < bag.length; slot++) {
      let x = (slot + 0.15 + 0.7 * random()) * slotWidth;
      if (errors.some((e) => e.y === lane.y && Math.abs(e.x - x) < 70)) x += 110;
      raw.push({ id: `${laneIndex}-${slot}`, type: bag[bagIndex++], x, y: lane.y });
    }
  }

  const angle = (m: { x: number; y: number }) => Math.atan2(m.y - HEIGHT / 2, m.x - WIDTH / 2);
  const tourClicks = raw
    .filter((m) => m.type === "click" && m.x > SAFE_MARGIN && m.x < WIDTH - SAFE_MARGIN) // không bị crop ở màn hình hẹp
    .sort((a, b) => edgeness(b.x, b.y) - edgeness(a.x, a.y))
    .slice(0, TOUR_CLICKS)
    .sort((a, b) => angle(a) - angle(b));

  const tourIndexById = new Map(tourClicks.map((m, i) => [m.id, i]));
  const laneByY = new Map(lanes.map((l) => [l.y, l]));

  const markers: Marker[] = raw.map((m) => {
    const lane = laneByY.get(m.y)!;
    const phase = (m.x - PULSE_FROM - PULSE_HEAD) / (PULSE_TO - PULSE_FROM);
    return {
      ...m,
      glowDuration: lane.pulseDuration,
      glowDelay: lane.pulseDelay + phase * lane.pulseDuration,
      tourIndex: tourIndexById.get(m.id) ?? -1,
    };
  });

  const tour: TourStop[] = tourClicks.map((m, i) => {
    const next = tourClicks[(i + 1) % tourClicks.length];
    const dx = next.x - m.x;
    const dy = next.y - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    const bend = dist * 0.18 * (i % 2 === 0 ? 1 : -1);
    return {
      x: m.x,
      y: m.y,
      arriveAt: i * (HOLD + LEG),
      midX: m.x + dx / 2 + (-dy / dist) * bend,
      midY: m.y + dy / 2 + (dx / dist) * bend,
    };
  });

  return { lanes, errors, markers, tour };
}

function buildTourCss(tour: TourStop[]): string {
  if (tour.length < 2) return "";

  const total = tour.length * (HOLD + LEG);
  const pct = (seconds: number) => `${((seconds / total) * 100).toFixed(3)}%`;
  const at = (x: number, y: number) => `transform: translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;

  const path: string[] = [];
  for (const stop of tour) {
    path.push(`${pct(stop.arriveAt)} { ${at(stop.x, stop.y)}; animation-timing-function: linear; }`);
    path.push(`${pct(stop.arriveAt + HOLD)} { ${at(stop.x, stop.y)}; animation-timing-function: ease-in; }`);
    path.push(
      `${pct(stop.arriveAt + HOLD + LEG / 2)} { ${at(stop.midX, stop.midY)}; animation-timing-function: ease-out; }`,
    );
  }
  path.push(`100% { ${at(tour[0].x, tour[0].y)}; }`);

  const press = tour
    .map((stop) => {
      const t = stop.arriveAt + PRESS_AT;
      return `${pct(t)} { transform: scale(1); } ${pct(t + 0.1)} { transform: scale(0.78); } ${pct(t + 0.34)} { transform: scale(1); }`;
    })
    .join("\n  ");

  return `
@keyframes bl-cursor-tour { ${path.join("\n  ")} }
@keyframes bl-cursor-press { 0% { transform: scale(1); }
  ${press}
  100% { transform: scale(1); } }
@keyframes bl-click-glow {
  0% { opacity: 0.6; transform: scale(1); }
  ${pct(0.15)} { opacity: 1; transform: scale(1.22); }
  ${pct(1.7)} { opacity: 0.6; transform: scale(1); }
  100% { opacity: 0.6; transform: scale(1); }
}
@keyframes bl-click-ripple {
  0% { opacity: 0.75; transform: scale(0.6); }
  ${pct(1.5)} { opacity: 0; transform: scale(3.2); }
  100% { opacity: 0; transform: scale(3.2); }
}
`;
}

const { lanes, errors, markers, tour } = buildTrace();
const tourCss = buildTourCss(tour);
const tourDuration = tour.length * (HOLD + LEG);

export default function EventTraceBackground() {
  return (
    <div className={styles.root} aria-hidden='true'>
      {tourCss && <style>{tourCss}</style>}
      <svg
        className={styles.svg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio='xMidYMid slice'
        focusable='false'
      >
        <defs>
          <linearGradient id='bl-trace-pulse' x1='0' x2='1' y1='0' y2='0'>
            <stop offset='0' className={styles.pulseStop} stopOpacity='0' />
            <stop offset='0.85' className={styles.pulseStop} stopOpacity='0.9' />
            <stop offset='1' className={styles.pulseStop} stopOpacity='0' />
          </linearGradient>
        </defs>

        {lanes.map((lane) => (
          <g key={lane.y}>
            <line className={styles.lane} x1='0' x2={WIDTH} y1={lane.y} y2={lane.y} />
            <path className={styles.ticks} d={lane.ticks} />
            <rect
              className={styles.pulse}
              x='0'
              y={lane.y - 1}
              width='260'
              height='2'
              fill='url(#bl-trace-pulse)'
              style={{
                animationDuration: `${lane.pulseDuration.toFixed(1)}s`,
                animationDelay: `${lane.pulseDelay.toFixed(1)}s`,
              }}
            />
          </g>
        ))}

        {markers.map((marker) => {
          const { icon: Icon, color } = EVENT_META[marker.type];
          const stop = marker.tourIndex >= 0 ? tour[marker.tourIndex] : undefined;
          const clickedByCursor = stop !== undefined;

          return (
            <g key={marker.id} transform={`translate(${marker.x.toFixed(1)} ${marker.y})`} style={{ color }}>
              {clickedByCursor && (
                <circle
                  className={styles.ripple}
                  r='13'
                  style={{
                    animationName: "bl-click-ripple",
                    animationDuration: `${tourDuration}s`,
                    animationDelay: `${((stop?.arriveAt ?? 0) + PRESS_AT).toFixed(2)}s`,
                  }}
                />
              )}
              <g
                className={clickedByCursor ? styles.chipClicked : styles.chip}
                style={
                  clickedByCursor
                    ? {
                        animationName: "bl-click-glow",
                        animationDuration: `${tourDuration}s`,
                        animationDelay: `${((stop?.arriveAt ?? 0) + PRESS_AT).toFixed(2)}s`,
                      }
                    : {
                        animationDuration: `${marker.glowDuration.toFixed(1)}s`,
                        animationDelay: `${marker.glowDelay.toFixed(2)}s`,
                      }
                }
              >
                <circle className={styles.chipBg} r='13' />
                <Icon x={-8} y={-8} size={16} strokeWidth={1.5} />
              </g>
            </g>
          );
        })}

        {errors.map((marker) => {
          const { icon: ErrorIcon, color } = EVENT_META.error;
          return (
            <g key={`${marker.x}-${marker.y}`} transform={`translate(${marker.x} ${marker.y})`} style={{ color }}>
              <circle className={styles.errorRing} r='9' style={{ animationDelay: `${marker.delay}s` }} />
              <g className={styles.errorChip}>
                <circle className={styles.chipBg} r='13' />
                <ErrorIcon x={-8} y={-8} size={16} strokeWidth={1.5} />
              </g>
            </g>
          );
        })}

        {tourCss && (
          <g
            className={styles.cursor}
            style={{ animationName: "bl-cursor-tour", animationDuration: `${tourDuration}s` }}
          >
            <g
              className={styles.cursorPress}
              style={{ animationName: "bl-cursor-press", animationDuration: `${tourDuration}s` }}
            >
              {/* Đầu mũi tên của icon nằm ở khoảng (4, 4) trên lưới 24: dịch lại để mũi tên trùng toạ độ đích */}
              <MousePointer2 className={styles.cursorIcon} x={-3.5} y={-3.5} size={52} strokeWidth={1.5} />
            </g>
          </g>
        )}
      </svg>
    </div>
  );
}
