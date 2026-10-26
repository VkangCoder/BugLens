import { useAuth } from "@/auth/useAuth";
import { App, Button, Dropdown, type MenuProps } from "antd";
import { ChevronDown, LogOut, User } from "lucide-react";
import styles from "./UserMenu.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

/** Account menu in the Topbar: user info + Log out (with confirmation). */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { modal } = App.useApp();

  if (!user) return null;

  function confirmLogout() {
    modal.confirm({
      title: "Log out",
      content: "Are you sure you want to log out?",
      okText: "Log out",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: logout,
    });
  }

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

  const onClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "logout") confirmLogout();
  };

  return (
    <Dropdown menu={{ items, onClick }} trigger={["click"]} placement='bottomRight'>
      <Button type='text' size='medium' className={styles.trigger} aria-label='Account menu' aria-haspopup='menu'>
        <span className={styles.avatar}>
          <User size={13} strokeWidth={1.5} />
        </span>
        <span className={styles.name}>{user.name}</span>
        <ChevronDown {...ICON} className={styles.chevron} />
      </Button>
    </Dropdown>
  );
}
