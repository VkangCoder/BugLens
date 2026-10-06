import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Table, Spin, Alert, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { getSessions } from "@/api/sessions";
import type { SessionResponse } from "@/types/session";
import styles from "./SessionListPage.module.scss";

const { Text } = Typography;

export default function SessionListPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessions"],
    queryFn: getSessions,
  });

  const columns: ColumnsType<SessionResponse> = [
    {
      title: "Session ID",
      dataIndex: "id",
      key: "id",
      width: 130,
      render: (id: string) => (
        <Text code style={{ fontSize: "12px" }}>
          {id.length > 8 ? `${id.slice(0, 8)}...` : id}
        </Text>
      ),
    },
    {
      title: "Initial URL",
      dataIndex: "initialUrl",
      key: "initialUrl",
      ellipsis: { showTitle: false },
      render: (url: string) => (
        <Tooltip placement="topLeft" title={url}>
          <Text>{url}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Browser",
      dataIndex: "browser",
      key: "browser",
      width: 160,
      render: (browser: SessionResponse["browser"]) => (
        <span>
          {browser.name} <Text type="secondary">v{browser.version}</Text>
        </span>
      ),
    },
    {
      title: "Viewport",
      dataIndex: "viewport",
      key: "viewport",
      width: 120,
      render: (viewport: SessionResponse["viewport"]) => (
        <Text type="secondary">
          {viewport.width} × {viewport.height}
        </Text>
      ),
    },
    {
      title: "Events",
      dataIndex: "events",
      key: "events",
      width: 100,
      align: "center",
      render: (events: SessionResponse["events"]) => (
        <Tag color="blue">{events?.length ?? 0} events</Tag>
      ),
    },

    {
      title: "Started At",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 180,
      render: (startedAt: string) =>
        new Date(startedAt).toLocaleString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
    },
    {
      title: "Duration",
      key: "duration",
      width: 100,
      render: (_, record) => {
        if (!record.endedAt) return <Text type="secondary">—</Text>;
        const ms =
          new Date(record.endedAt).getTime() -
          new Date(record.startedAt).getTime();
        return `${(ms / 1000).toFixed(1)}s`;
      },
    },
  ];

  if (isLoading)
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  if (isError)
    return <Alert type="error" title="Failed to load sessions" showIcon />;

  return (
    <Table<SessionResponse>
      columns={columns}
      dataSource={data}
      rowKey="id"
      onRow={(record) => ({
        onClick: () => navigate(`/sessions/${record.id}`),
        style: { cursor: "pointer" },
      })}
    />
  );
}
