import { Layout } from "antd";
import { Outlet } from "react-router";
import Sidebar from "@/layouts/AppLayout/components/Sidebar";
import Topbar from "@/layouts/AppLayout/components/Topbar";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import styles from "./AppLayout.module.scss";

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useLocalStorage("buglens-sidebar-collapsed", false);

  return (
    <Layout className={styles.root}>
      {/* 224px, or 56px icons only when collapsed */}
      <Sider
        width={224}
        collapsedWidth={56}
        collapsed={collapsed}
        trigger={null}
        className={styles.sider}
      >
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      </Sider>
      <Layout className={styles.main}>
        <Header className={styles.header}>
          <Topbar />
        </Header>
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
