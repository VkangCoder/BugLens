import { getSessionById } from "@/api/sessions";
import { useQuery } from "@tanstack/react-query";
import { App, Breadcrumb, Input, type InputRef } from "antd";
import { ChevronRight, Search } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useMatch, useNavigate, useSearchParams } from "react-router";
import styles from "./Topbar.module.scss";

const SESSION_ID = /^[a-f0-9]{24}$/i; // MongoDB ObjectId
const IS_MAC = navigator.platform.toUpperCase().includes("MAC");

function pathOf(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return host + pathname;
  } catch {
    return url;
  }
  console.log();
}

function useCrumbs(): { title: ReactNode }[] {
  const [searchParams] = useSearchParams();
  const detail = useMatch("/sessions/:id");
  const id = detail?.params.id;

  const { data: session } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => getSessionById(id!),
    enabled: !!id,
  });

  const sessions = { title: <Link to="/">Sessions</Link> };

  if (id) {
    return [
      sessions,
      ...(session
        ? [
            {
              title: (
                <span className={styles.crumbMuted}>
                  {pathOf(session.initialUrl)}
                </span>
              ),
            },
          ]
        : []),
      { title: <span className={styles.crumbMono}>{id}</span> },
    ];
  }

  if (searchParams.get("hasErrors") === "true") {
    return [sessions, { title: "Errors" }];
  }

  return [{ title: "Sessions" }];
}

export default function Topbar({ right }: { right?: ReactNode }) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const inputRef = useRef<InputRef>(null);
  const [query, setQuery] = useState("");
  const crumbs = useCrumbs();

  // Ctrl+K / ⌘K focuses "Jump to session"
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function jump() {
    const id = query.trim();
    if (!SESSION_ID.test(id)) {
      message.warning("Paste a full session ID (24 characters).");
      return;
    }
    setQuery("");
    inputRef.current?.blur();
    navigate(`/sessions/${id}`);
  }

  return (
    <div className={styles.topbar}>
      <Breadcrumb
        className={styles.breadcrumb}
        separator={
          <ChevronRight
            size={14}
            strokeWidth={1.5}
            className={styles.separator}
          />
        }
        items={crumbs}
      />

      <Input
        ref={inputRef}
        size="small"
        className={styles.jump}
        placeholder="Jump to session…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onPressEnter={jump}
        onKeyDown={(e) => e.key === "Escape" && inputRef.current?.blur()}
        prefix={
          <Search size={14} strokeWidth={1.5} className={styles.searchIcon} />
        }
        suffix={
          <span className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{IS_MAC ? "⌘" : "Ctrl"}</kbd>
            <kbd className={styles.kbd}>K</kbd>
          </span>
        }
      />

      {right}
    </div>
  );
}
