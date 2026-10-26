import { useAuth } from "@/auth/useAuth";
import { Button, Dropdown, type MenuProps } from "antd";
import { ChevronDown, LogOut, User } from "lucide-react";
import styles from "./UserMenu.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

export default function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const items: MenuProps["items"] = [
    {
      key: "account",
      type: "group",
      label: (
        <div className={styles.account}>
          <span className={styles.accountName}>{user.name}</span>
          <span className={styles.accountRole}>{user.role}</span>
        </div>
      ),
    },
    { type: "divider" },
    { key: "logout", icon: <LogOut {...ICON} />, label: "Log out", danger: true },
  ];

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") {
      logout();
    }
  };

  return (
    <Dropdown menu={{ items, onClick: onMenuClick }} trigger={["click"]} placement='bottomRight'>
      <Button type='text' size='large' className={styles.trigger} aria-label='Account menu' aria-haspopup='menu'>
        <span className={styles.avatar}>
          <User size={13} strokeWidth={1.5} />
        </span>
        <span className={styles.name}>{user.name}</span>
        <ChevronDown {...ICON} className={styles.chevron} />
      </Button>
    </Dropdown>
  );
}
