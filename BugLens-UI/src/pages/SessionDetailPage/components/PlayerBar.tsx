import { Button, Tooltip } from "antd";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { formatOffset } from "@/utils/events";
import styles from "./PlayerBar.module.scss";

const ICON = { size: 16, strokeWidth: 1.5 };

interface PlayerBarProps {
  time: number;
  duration: number;
  playing: boolean;
  onPlay: () => void;
  onStep: (direction: -1 | 1) => void;
}

export default function PlayerBar({ time, duration, playing, onPlay, onStep }: PlayerBarProps) {
  return (
    <div className={styles.player}>
      <Tooltip title="Previous event">
        <Button type="text" size="small" icon={<SkipBack {...ICON} />} aria-label="Previous event" onClick={() => onStep(-1)} />
      </Tooltip>
      <Button
        size="small"
        icon={playing ? <Pause {...ICON} /> : <Play {...ICON} />}
        aria-label={playing ? "Pause" : "Play"}
        onClick={onPlay}
      />
      <Tooltip title="Next event">
        <Button type="text" size="small" icon={<SkipForward {...ICON} />} aria-label="Next event" onClick={() => onStep(1)} />
      </Tooltip>
      <span className={styles.time}>{formatOffset(time)}</span>
      <span className={styles.total}>/ {formatOffset(duration)}</span>
    </div>
  );
}
