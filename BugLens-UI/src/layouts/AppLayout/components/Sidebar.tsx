import { Button, Menu, Tooltip, type MenuProps } from "antd";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  CircleAlert,
  Folder,
  List,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useSessionCount } from "@/hooks/useSessionCount";
import { useTheme } from "@/theme/useTheme";
import Logo from "./Logo";
import styles from "./Sidebar.module.scss";

const COMING_SOON = "Coming soon";
const ICON = { size: 16, strokeWidth: 1.5 };

function Count({ value, danger }: { value?: number; danger?: boolean }) {
  if (value === undefined) return null;
  return (
    <span
      className={`${styles.count} ${danger && value > 0 ? styles.countDanger : ""}`}
    >
      {value}
    </span>
  );
}

function comingSoon(label: string) {
  return (
    <Tooltip title={COMING_SOON} placement="right">
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
  const { isDark, toggleMode } = useTheme();

  const sessionCount = useSessionCount();
  const errorCount = useSessionCount(true);

  const selectedKey =
    pathname === "/" && searchParams.get("hasErrors") === "true"
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
  ];

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "sessions") navigate("/");
    if (key === "errors") navigate("/?hasErrors=true");
  };

  return (
    <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
      <Link to="/" className={styles.brand} aria-label="BugLens home">
        <Logo size={20} wordmark={!collapsed} />
      </Link>

      <Menu
        mode="inline"
        items={items}
        selectedKeys={[selectedKey]}
        onClick={onClick}
        className={styles.menu}
      />

      <div className={styles.spacer} />

      <div className={styles.footer}>
        <Tooltip title={COMING_SOON} placement={collapsed ? "right" : "top"}>
          <div className={styles.user} aria-disabled="true">
            <span className={styles.avatar}>
              <User size={14} strokeWidth={1.5} />
            </span>
            {!collapsed && <span className={styles.userName}>Not signed in</span>}
          </div>
        </Tooltip>

        <Tooltip
          title={isDark ? "Switch to light theme" : "Switch to dark theme"}
          placement={collapsed ? "right" : "top"}
        >
          <Button
            type="text"
            size="small"
            icon={isDark ? <Sun {...ICON} /> : <Moon {...ICON} />}
            onClick={toggleMode}
            aria-label="Toggle theme"
          />
        </Tooltip>

        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"} placement={collapsed ? "right" : "top"}>
          <Button
            type="text"
            size="small"
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
