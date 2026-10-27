import type { ReactNode } from "react";
import styles from "./AdminPage.module.scss";

interface AdminPageProps {
  title: ReactNode;
  // One line of facts about what is on the page (counts, state), not a description of the page
  subtitle?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
}

/** Page frame shared with the Sessions list: header, optional toolbar, full-bleed scrolling body. */
export default function AdminPage({ title, subtitle, actions, toolbar, children }: AdminPageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
      <div className={styles.body}>{children}</div>
    </div>
  );
}
