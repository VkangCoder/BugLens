import { Layout } from "antd";
import { Outlet } from "react-router";
import Sidebar from "@/layouts/AppLayout/components/Sidebar";
import Topbar from "@/layouts/AppLayout/components/Topbar";
import styles from "./AppLayout.module.scss";

const { Sider, Header, Content } = Layout;

export default function AppLayout() {
  return (
    <Layout className={styles.root}>
      <Sider width={224} className={styles.sider}>
        <Sidebar />
      </Sider>
      <Layout>
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
