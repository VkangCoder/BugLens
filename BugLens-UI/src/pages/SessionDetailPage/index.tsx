import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Timeline,
  Spin,
  Alert,
  Row,
  Col,
  Card,
  Typography,
  Empty,
  Button,
} from "antd";
import { getSessionById } from "@/api/sessions";
import type { BugEvent } from "@/types/session";
const { Text } = Typography;

function renderEventSummary(event: BugEvent): string {
  switch (event.type) {
    case "click":
      return `Click ${event.data.tagName}${event.data.text ? ` "${event.data.text}"` : ""}`;
    case "network":
      return `${event.data.method} ${event.data.url} → ${event.data.status} (${event.data.duration}ms)`;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
function formatRelativeTime(
  eventTimestamp: string,
  sessionStart: string,
): string {
  const ms =
    new Date(eventTimestamp).getTime() - new Date(sessionStart).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const millis = String(ms % 1000).padStart(3, "0");
  return `${minutes}:${seconds}.${millis}`;
}
export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState<BugEvent | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => getSessionById(id!),
    enabled: !!id,
  });

  if (isLoading) return <Spin size="large" />;
  if (isError || !data)
    return <Alert type="error" message="Không tải được session" showIcon />;

  const handleGoHome = () => {
    // Thực hiện logic khác tại đây nếu cần
    navigate("/"); // Chuyển hướng về trang chủ
  };

  return (
    <Row gutter={16}>
      <Col span={12}>
        <Card title="Timeline">
          <Timeline
            items={data.events.map((event, index) => ({
              key: index,
              color: selectedEvent === event ? "blue" : "gray",
              children: (
                <div
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {formatRelativeTime(event.timestamp, data.startedAt)}
                  </Text>
                  <div>{renderEventSummary(event)}</div>
                </div>
              ),
            }))}
          />
        </Card>
      </Col>
      <Col span={12}>
        <Card title="Event Detail">
          {" "}
          <Card title="Event Detail">
            {selectedEvent ? (
              <pre style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            ) : (
              <Empty description="Select an event to view more." />
            )}
          </Card>
        </Card>
      </Col>
      <Col span={10}>
        <Button onClick={handleGoHome}>Return</Button>
      </Col>
    </Row>
  );
}
