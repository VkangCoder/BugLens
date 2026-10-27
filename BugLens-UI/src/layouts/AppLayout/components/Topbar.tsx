import { listProjects } from "@/api/projects";
import { getSessionById } from "@/api/sessions";
import { useQuery } from "@tanstack/react-query";
import { App, Breadcrumb, Button, Input, Tooltip, type InputRef } from "antd";
import { ChevronRight, Moon, Search, Sun } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useMatch, useNavigate, useSearchParams } from "react-router";
import styles from "./Topbar.module.scss";
import { useTheme } from "@/theme/useTheme";
import UserMenu from "@/components/UserMenu/UserMenu";

const SESSION_ID = /^[a-f0-9]{24}$/i; // MongoDB ObjectId
const IS_MAC = navigator.platform.toUpperCase().includes("MAC");
const ICON = { size: 16, strokeWidth: 1.5 };

function pathOf(url: string): string {
  try {
    const { host, pathname } = new URL(url);
    return host + pathname;
  } catch {
    return url;
  }
}

function useCrumbs(): { title: ReactNode }[] {
  const [searchParams] = useSearchParams();
  const detail = useMatch("/sessions/:id");
  const projectList = useMatch("/projects");
  const projectDetail = useMatch("/projects/:id");
  const admin = useMatch("/admin/:section");
  const id = detail?.params.id;
  const projectId = projectDetail?.params.id ?? searchParams.get("project");

  const { data: session } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => getSessionById(id!),
    enabled: !!id,
  });

  // Same cache as the Projects pages, so the name is usually there already
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: !!projectId,
  });
  const projectName = projects?.find((p) => p.id === projectId)?.name;

  const sessions = { title: <Link to='/'>Sessions</Link> };
  const projectsCrumb = { title: <Link to='/projects'>Projects</Link> };

  if (projectList) return [{ title: "Projects" }];

  if (projectDetail) {
    return [
      projectsCrumb,
      { title: projectName ?? <span className={styles.crumbMono}>{projectDetail.params.id}</span> },
    ];
  }

  if (id) {
    return [
      sessions,
      ...(session
        ? [
            {
              title: <span className={styles.crumbMuted}>{pathOf(session.initialUrl)}</span>,
            },
          ]
        : []),
      { title: <span className={styles.crumbMono}>{id}</span> },
    ];
  }

  if (admin) {
    return [{ title: "Admin" }, { title: admin.params.section === "users" ? "Users" : "Projects" }];
  }

  if (projectId) {
    return [
      projectsCrumb,
      { title: <Link to={`/projects/${encodeURIComponent(projectId)}`}>{projectName ?? "Project"}</Link> },
      { title: searchParams.get("hasErrors") === "true" ? "Errors" : "Sessions" },
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
  const { isDark, toggleMode } = useTheme();

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
        separator={<ChevronRight size={14} strokeWidth={1.5} className={styles.separator} />}
        items={crumbs}
      />

      <Input
        ref={inputRef}
        size='small'
        className={styles.jump}
        placeholder='Jump to session…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onPressEnter={jump}
        onKeyDown={(e) => e.key === "Escape" && inputRef.current?.blur()}
        prefix={<Search size={14} strokeWidth={1.5} className={styles.searchIcon} />}
        suffix={
          <span className={styles.kbdGroup}>
            <kbd className={styles.kbd}>{IS_MAC ? "⌘" : "Ctrl"}</kbd>
            <kbd className={styles.kbd}>K</kbd>
          </span>
        }
      />

      <Tooltip title={isDark ? "Switch to light theme" : "Switch to dark theme"}>
        <Button
          type='text'
          size='small'
          icon={isDark ? <Sun {...ICON} /> : <Moon {...ICON} />}
          onClick={toggleMode}
          aria-label='Toggle theme'
        />
      </Tooltip>
      <UserMenu />
      {right}
    </div>
  );
}
