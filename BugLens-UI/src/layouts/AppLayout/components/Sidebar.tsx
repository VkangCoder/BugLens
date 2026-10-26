import { Button, Menu, Tooltip, type MenuProps } from "antd";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { CircleAlert, Folder, List, Boxes, PanelLeftClose, PanelLeftOpen, Settings, Users } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { useSessionCount } from "@/hooks/useSessionCount";
import Logo from "./Logo";
import styles from "./Sidebar.module.scss";

const COMING_SOON = "Coming soon";
const ICON = { size: 16, strokeWidth: 1.5 };

function Count({ value, danger }: { value?: number; danger?: boolean }) {
  if (value === undefined) return null;
  return <span className={`${styles.count} ${danger && value > 0 ? styles.countDanger : ""}`}>{value}</span>;
}

function comingSoon(label: string) {
  return (
    <Tooltip title={COMING_SOON} placement='right'>
      <span className={styles.disabledLabel}>{label}</span>
    </Tooltip>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();

  const sessionCount = useSessionCount();
  const errorCount = useSessionCount(true);

  const selectedKey = pathname.startsWith("/admin/projects")
    ? "projects"
    : pathname.startsWith("/admin/users")
      ? "users"
      : pathname === "/" && searchParams.get("hasErrors") === "true"
        ? "errors"
        : "sessions";

  const items: MenuProps["items"] = [
    {
      key: "sessions",
      icon: <List {...ICON} />,
      label: "Sessions",
      extra: collapsed ? null : <Count value={sessionCount} />,
    },
    {
      key: "errors",
      icon: <CircleAlert {...ICON} />,
      label: "Errors",
      extra: collapsed ? null : <Count value={errorCount} danger />,
    },
    {
      key: "saved-views",
      icon: <Folder {...ICON} />,
      label: comingSoon("Saved views"),
      disabled: true,
    },
    {
      key: "settings",
      icon: <Settings {...ICON} />,
      label: comingSoon("Settings"),
      disabled: true,
    },
    ...(isAdmin
      ? [
          { type: "divider" as const },
          {
            type: "group" as const,
            label: collapsed ? null : "Admin",
            children: [
              { key: "projects", icon: <Boxes {...ICON} />, label: "Projects" },
              { key: "users", icon: <Users {...ICON} />, label: "Users" },
            ],
          },
        ]
      : []),
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "sessions") navigate("/");
    if (key === "errors") navigate("/?hasErrors=true");
    if (key === "projects") navigate("/admin/projects");
    if (key === "users") navigate("/admin/users");
  };

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <Link to='/' className={styles.brand} aria-label='BugLens home'>
        <Logo size={20} wordmark={!collapsed} />
      </Link>

      <Menu mode='inline' items={items} selectedKeys={[selectedKey]} onClick={onClick} className={styles.menu} />

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement={collapsed ? "right" : "top"}>
          <Button
            type='text'
            size='small'
            icon={collapsed ? <PanelLeftOpen {...ICON} /> : <PanelLeftClose {...ICON} />}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          />
        </Tooltip>
      </div>
    </div>
  );
}
