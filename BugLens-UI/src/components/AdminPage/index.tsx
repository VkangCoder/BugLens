import type { ReactNode } from "react";
import styles from "./AdminPage.module.scss";

interface AdminPageProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Shared frame for admin pages: title + action buttons + content. */
export default function AdminPage({ title, subtitle, actions, children }: AdminPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        {actions}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
