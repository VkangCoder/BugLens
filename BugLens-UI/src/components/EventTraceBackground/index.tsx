import styles from "./EventTraceBackground.module.scss";

const WIDTH = 1600;
const HEIGHT = 900;
const LANE_COUNT = 9;
const LANE_TOP = 110;
const LANE_GAP = 85;

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

interface ErrorMarker {
  x: number;
  y: number;
  delay: number;
}

function buildTrace(): { lanes: Lane[]; errors: ErrorMarker[] } {
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
  return { lanes, errors };
}

const { lanes, errors } = buildTrace();

export default function EventTraceBackground() {
  return (
    <div className={styles.root} aria-hidden='true'>
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

        {errors.map((marker) => (
          <g key={`${marker.x}-${marker.y}`}>
            <circle
              className={styles.errorRing}
              cx={marker.x}
              cy={marker.y}
              r='5'
              style={{ animationDelay: `${marker.delay}s` }}
            />
            <circle className={styles.errorDot} cx={marker.x} cy={marker.y} r='3.5' />
          </g>
        ))}
      </svg>
    </div>
  );
}
