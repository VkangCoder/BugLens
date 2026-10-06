import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Empty,
  Popover,
  Spin,
  Splitter,
  Tabs,
  Tag,
  Tooltip,
} from "antd";
import { ListFilter, PanelRight, Trash2 } from "lucide-react";
import { deleteSession, getSessionById } from "@/api/sessions";
import EventTag from "@/components/EventTag";
import StatusBadge from "@/components/StatusBadge";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { BugEvent, BugEventType, SessionResponse } from "@/types/session";
import { EVENT_TYPES, formatOffset } from "@/utils/events";
import { formatDateTime, formatDuration, hostAndPath } from "@/utils/format";
import EventRow from "./components/EventRow";
import Inspector from "./components/Inspector";
import PlayerBar from "./components/PlayerBar";
import Timeline from "./components/Timeline";
import styles from "./SessionDetailPage.module.scss";

type TabKey = "events" | "console" | "network" | "env";

const TAB_TYPES: Record<Exclude<TabKey, "env">, BugEventType[]> = {
  events: EVENT_TYPES,
  console: ["console", "error"],
  network: ["network"],
};

const ICON = { size: 14, strokeWidth: 1.5 };

const INSPECTOR_DEFAULT_WIDTH = 380;
const INSPECTOR_MIN_WIDTH = 280;
const INSPECTOR_MAX_WIDTH = 640;

export default function SessionDetailPage() {
  const { id } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => getSessionById(id!),
    enabled: !!id,
  });

  if (isLoading)
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    );
  if (isError || !data)
    return (
      <Alert
        className={styles.alert}
        type="error"
        title="Failed to load session."
        showIcon
      />
    );

  // key: reset selection and playback when another session is opened
  return <SessionDetail key={data.id} session={data} />;
}

function SessionDetail({ session }: { session: SessionResponse }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const [searchParams] = useSearchParams();

  const start = new Date(session.startedAt).getTime();
  const events = session.events;
  const offsets = useMemo(
    () => events.map((e) => new Date(e.timestamp).getTime() - start),
    [events, start],
  );
  const duration = Math.max(
    session.endedAt ? new Date(session.endedAt).getTime() - start : 0,
    offsets.length ? Math.max(...offsets) : 0,
  );
  const errorCount = events.filter((e) => e.type === "error").length;

  // ── Selection & playback ──
  const firstError = events.findIndex((e) => e.type === "error");
  const fromUrl = Number(searchParams.get("event")) - 1;
  const initial =
    fromUrl >= 0 && fromUrl < events.length
      ? fromUrl
      : firstError >= 0
        ? firstError
        : events.length
          ? 0
          : null;

  const [pickedEvent, setPickedEvent] = useState<number | null>(initial);
  const [time, setTime] = useState(initial !== null ? offsets[initial] : 0);
  const [playRequested, setPlayRequested] = useState(false);
  // Playback stops by itself once the playhead reaches the end
  const playing = playRequested && time < duration;

  // Latest event that has happened at the playhead
  function latestAt(ms: number): number | null {
    let latest: number | null = null;
    offsets.forEach((o, i) => {
      if (o <= ms) latest = i;
    });
    return latest;
  }

  // While playing, the selection follows the playhead
  const selected = playing ? (latestAt(time) ?? pickedEvent) : pickedEvent;

  function select(index: number) {
    setPickedEvent(index);
    setTime(offsets[index]);
  }

  function togglePlay() {
    if (playing) {
      setPickedEvent(selected);
      setPlayRequested(false);
    } else {
      if (time >= duration) setTime(0);
      setPlayRequested(true);
    }
  }

  // Advance the playhead every 100ms while playing
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setTime((t) => Math.min(duration, t + 100)),
      100,
    );
    return () => clearInterval(timer);
  }, [playing, duration]);

  // ── Filters ──
  const [tab, setTab] = useState<TabKey>("events");
  const [visibleTypes, setVisibleTypes] = useState<BugEventType[]>(EVENT_TYPES);

  const listTypes =
    tab === "env" ? [] : TAB_TYPES[tab].filter((t) => visibleTypes.includes(t));
  const listed = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => listTypes.includes(event.type));
  const timelineItems = events.map((event, index) => ({
    type: event.type,
    offset: offsets[index],
    index,
  }));
  const visibleTimeline = timelineItems.filter((item) =>
    visibleTypes.includes(item.type),
  );

  function step(direction: -1 | 1) {
    if (!listed.length) return;
    const position = listed.findIndex((item) => item.index === selected);
    const next =
      listed[Math.max(0, Math.min(listed.length - 1, position + direction))];
    select(next.index);
  }

  const countOf = (types: BugEventType[]) =>
    events.filter((e) => types.includes(e.type)).length;

  // ── Inspector panel ──
  const [inspectorOpen, setInspectorOpen] = useState(
    () => window.innerWidth >= 1100,
  );
  // Width set by dragging the splitter; double-click the bar to reset
  const [inspectorWidth, setInspectorWidth] = useLocalStorage(
    "buglens-inspector-width",
    INSPECTOR_DEFAULT_WIDTH,
  );
  const showInspector =
    inspectorOpen && selected !== null && !!events[selected];

  // ── Delete ──
  const deleteMutation = useMutation({
    mutationFn: () => deleteSession(session.id),
    onSuccess: () => {
      message.success("Session deleted.");
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      navigate("/");
    },
    onError: () => message.error("Delete failed. The session was kept."),
  });

  function confirmDelete() {
    modal.confirm({
      title: "Delete this session?",
      content: `${events.length} recorded events are removed permanently.`,
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(),
    });
  }

  const typeFilter = (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Checkbox.Group
          className={styles.typeFilter}
          value={visibleTypes}
          onChange={(values) => setVisibleTypes(values as BugEventType[])}
          options={EVENT_TYPES.map((type) => ({
            value: type,
            label: (
              <span className={styles.typeOption}>
                <EventTag type={type} />
                <span className={styles.typeCount}>{countOf([type])}</span>
              </span>
            ),
          }))}
        />
      }
    >
      <Button size="small" type="text" icon={<ListFilter {...ICON} />}>
        Types {visibleTypes.length}/{EVENT_TYPES.length}
      </Button>
    </Popover>
  );

  const tabLabel = (label: string, count?: number) => (
    <span className={styles.tabLabel}>
      {label}
      {count !== undefined && <span className={styles.tabCount}>{count}</span>}
    </span>
  );

  return (
    <Splitter
      className={styles.page}
      onResize={(sizes) => {
        if (showInspector && sizes[1]) setInspectorWidth(Math.round(sizes[1]));
      }}
      onDraggerDoubleClick={() => setInspectorWidth(INSPECTOR_DEFAULT_WIDTH)}
    >
      <Splitter.Panel min={420} className={styles.main}>
        {/* ── Header ── */}
        <header className={styles.header}>
          <div className={styles.heading}>
            <h1 className={styles.title} title={session.initialUrl}>
              {hostAndPath(session.initialUrl)}
            </h1>
            <div className={styles.meta}>
              <StatusBadge errorCount={errorCount} />
              <Tag className={styles.project}>{session.projectId}</Tag>
              <span className={styles.metaText}>
                {session.browser.name} {session.browser.version} ·{" "}
                {session.viewport.width} × {session.viewport.height} ·{" "}
                {formatDuration(session.startedAt, session.endedAt)} ·{" "}
                {formatDateTime(session.startedAt)}
              </span>
            </div>
          </div>
          <Tooltip title="Delete session">
            <Button
              size="small"
              icon={<Trash2 {...ICON} />}
              onClick={confirmDelete}
              aria-label="Delete session"
            />
          </Tooltip>
          <Tooltip title={inspectorOpen ? "Hide inspector" : "Show inspector"}>
            <Button
              size="small"
              type={inspectorOpen ? "default" : "text"}
              icon={<PanelRight {...ICON} />}
              onClick={() => setInspectorOpen((open) => !open)}
              aria-label="Toggle inspector"
              aria-pressed={inspectorOpen}
            />
          </Tooltip>
        </header>

        {/* ── Timeline ── */}
        <Card
          size="small"
          className={styles.timelineCard}
          title={
            <span className={styles.cardTitle}>
              Timeline
              <span className={styles.cardSubtitle}>
                {events.length} events · {formatOffset(duration).slice(0, 5)}
              </span>
            </span>
          }
          extra={
            <PlayerBar
              time={time}
              duration={duration}
              playing={playing}
              onPlay={togglePlay}
              onStep={step}
            />
          }
        >
          {visibleTimeline.length ? (
            <Timeline
              items={visibleTimeline}
              duration={duration}
              playhead={time}
              selected={
                selected === null
                  ? null
                  : visibleTimeline.findIndex((item) => item.index === selected)
              }
              onSeek={setTime}
              onSelect={(i) => select(visibleTimeline[i].index)}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No events of the selected types."
            />
          )}
        </Card>

        {/* ── Event log ── */}
        <Tabs
          className={styles.tabs}
          size="small"
          activeKey={tab}
          onChange={(key) => setTab(key as TabKey)}
          tabBarExtraContent={tab === "env" ? null : typeFilter}
          items={[
            { key: "events", label: tabLabel("Events", events.length) },
            {
              key: "console",
              label: tabLabel("Console", countOf(TAB_TYPES.console)),
            },
            {
              key: "network",
              label: tabLabel("Network", countOf(TAB_TYPES.network)),
            },
            { key: "env", label: tabLabel("Environment") },
          ]}
        />

        <div className={styles.list}>
          {tab === "env" ? (
            <dl className={styles.env}>
              {[
                ["Session ID", session.id],
                ["Project", session.projectId],
                ["Initial URL", session.initialUrl],
                [
                  "Browser",
                  `${session.browser.name} ${session.browser.version}`,
                ],
                [
                  "Viewport",
                  `${session.viewport.width} × ${session.viewport.height}`,
                ],
                ["Started", formatDateTime(session.startedAt)],
                [
                  "Ended",
                  session.endedAt ? formatDateTime(session.endedAt) : "—",
                ],
                [
                  "Duration",
                  formatDuration(session.startedAt, session.endedAt),
                ],
              ].map(([label, value]) => (
                <EnvRow key={label} label={label} value={value} />
              ))}
            </dl>
          ) : listed.length ? (
            listed.map(({ event, index }) => (
              <EventRow
                key={index}
                index={index + 1}
                event={event}
                offset={offsets[index]}
                selected={selected === index}
                onClick={() => select(index)}
              />
            ))
          ) : (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No events here."
            />
          )}
        </div>
      </Splitter.Panel>

      {showInspector && (
        <Splitter.Panel
          size={inspectorWidth}
          min={INSPECTOR_MIN_WIDTH}
          max={INSPECTOR_MAX_WIDTH}
          className={styles.inspectorPanel}
        >
          <Inspector
            event={events[selected!] as BugEvent}
            index={selected!}
            offset={offsets[selected!]}
          />
        </Splitter.Panel>
      )}
    </Splitter>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
