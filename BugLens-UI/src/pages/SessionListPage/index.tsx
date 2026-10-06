import { useEffect, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import {
  Alert,
  App,
  Button,
  Empty,
  Input,
  Segmented,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { Check, Copy, Download, Search, Trash2 } from "lucide-react";
import { deleteSession, getSessions } from "@/api/sessions";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useSessionCount } from "@/hooks/useSessionCount";
import type { SessionSort, SessionSummary } from "@/types/session";
import {
  formatDateTime,
  formatDuration,
  formatRelative,
  hostAndPath,
} from "@/utils/format";
import styles from "./SessionListPage.module.scss";

type Scope = "all" | "errors";

const DEFAULT_PAGE_SIZE = 20;

// Table top border (1px) + header (32px + 1px border) + pagination bar (24px + 2 × 12px padding)
const TABLE_CHROME_HEIGHT = 34 + 48;
const ICON = { size: 14, strokeWidth: 1.5 };

const { Text } = Typography;

// MongoDB IDs are 24 characters: show "6ac3d4ce…f21b", copy the full value
function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function StatusBadge({ errorCount }: { errorCount: number }) {
  const isError = errorCount > 0;
  return (
    <span className={`${styles.badge} ${isError ? styles.badgeDanger : ""}`}>
      <span className={styles.badgeDot} />
      {isError ? "Error" : "Recorded"}
    </span>
  );
}

export default function SessionListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message, modal } = App.useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;
  const scope: Scope =
    searchParams.get("hasErrors") === "true" ? "errors" : "all";
  const search = searchParams.get("q") ?? "";
  const sort: SessionSort =
    searchParams.get("sort") === "oldest" ? "oldest" : "newest";

  function updateParams(next: {
    page?: number;
    pageSize?: number;
    scope?: Scope;
    search?: string;
    sort?: SessionSort;
  }) {
    const merged = { page, pageSize, scope, search, sort, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("q", merged.search);
    if (merged.scope === "errors") params.set("hasErrors", "true");
    if (merged.sort !== "newest") params.set("sort", merged.sort);
    if (merged.page > 1) params.set("page", String(merged.page));
    if (merged.pageSize !== DEFAULT_PAGE_SIZE)
      params.set("pageSize", String(merged.pageSize));
    setSearchParams(params);
  }

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(
      () => updateParams({ search: searchInput.trim(), page: 1 }),
      300,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const params = {
    page,
    pageSize,
    hasErrors: scope === "errors" ? true : undefined,
    search: search || undefined,
    sort,
  };

  const { data, isFetching, isError } = useQuery({
    queryKey: ["sessions", params],
    queryFn: () => getSessions(params),
    placeholderData: keepPreviousData,
  });

  const totalCount = useSessionCount();
  const errorCount = useSessionCount(true);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // The table fills the rest of the screen: header and pagination stay put, rows scroll
  const [tableAreaRef, tableAreaHeight] = useElementHeight<HTMLDivElement>();
  const bodyHeight = Math.max(120, tableAreaHeight - TABLE_CHROME_HEIGHT);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(deleteSession)),
    onSuccess: (_, ids) => {
      message.success(
        `${ids.length} ${ids.length === 1 ? "session" : "sessions"} deleted.`,
      );
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: () =>
      message.error("Delete failed. Nothing was removed on your side."),
  });

  function confirmDelete() {
    modal.confirm({
      title: `Delete ${selectedIds.length} ${selectedIds.length === 1 ? "session" : "sessions"}?`,
      content: "Recorded events are removed permanently.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutateAsync(selectedIds),
    });
  }

  function exportPage() {
    const blob = new Blob([JSON.stringify(data?.items ?? [], null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `buglens-sessions-page-${page}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const columns: ColumnsType<SessionSummary> = [
    {
      title: "Session",
      key: "session",
      render: (_, s) => (
        <div className={styles.session}>
          <span className={styles.sessionTitle} title={s.initialUrl}>
            {hostAndPath(s.initialUrl)}
          </span>
          <span className={styles.sessionMeta}>
            <Text
              className={styles.sessionId}
              copyable={{
                text: s.id,
                icon: [
                  <Copy key="copy" {...ICON} />,
                  <Check key="done" {...ICON} />,
                ],
                tooltips: ["Copy session ID", "Copied"],
              }}
            >
              <Tooltip title={s.id}>{shortId(s.id)}</Tooltip>
            </Text>
            <span>
              {s.browser.name} {s.browser.version}
            </span>
            <span>
              {s.viewport.width} × {s.viewport.height}
            </span>
          </span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "errorCount",
      key: "status",
      width: 110,
      render: (count: number) => <StatusBadge errorCount={count} />,
    },
    {
      title: "Events",
      dataIndex: "eventCount",
      key: "events",
      width: 100,
      render: (count: number) => (
        <span className={styles.mono}>{count} events</span>
      ),
    },
    {
      title: "Duration",
      key: "duration",
      width: 90,
      render: (_, s) => (
        <span className={styles.mono}>
          {formatDuration(s.startedAt, s.endedAt)}
        </span>
      ),
    },
    {
      title: "Recorded",
      dataIndex: "startedAt",
      key: "recorded",
      width: 110,
      align: "right",
      fixed: "right",
      render: (startedAt: string) => (
        <Tooltip title={formatDateTime(startedAt)} placement="left">
          <span className={styles.recorded}>{formatRelative(startedAt)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h1 className={styles.title}>Sessions</h1>
          <p className={styles.subtitle}>
            Recorded by the BugLens extension across acme-web.
          </p>
        </div>
        <Button
          size="small"
          icon={<Download {...ICON} />}
          onClick={exportPage}
          disabled={!data?.items.length}
        >
          Export
        </Button>
      </header>

      <div className={styles.toolbar}>
        <Input
          size="small"
          allowClear
          className={styles.search}
          placeholder="Filter by URL or session ID"
          prefix={<Search {...ICON} className={styles.searchIcon} />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Segmented<Scope>
          size="small"
          value={scope}
          onChange={(value) => updateParams({ scope: value, page: 1 })}
          options={[
            {
              value: "all",
              label: (
                <span className={styles.segment}>
                  All{" "}
                  <span className={styles.segmentCount}>
                    {totalCount ?? ""}
                  </span>
                </span>
              ),
            },
            {
              value: "errors",
              label: (
                <span className={styles.segment}>
                  Errors{" "}
                  <span className={styles.segmentCount}>
                    {errorCount ?? ""}
                  </span>
                </span>
              ),
            },
          ]}
        />
        <div className={styles.toolbarSpacer} />
        {/* <Tooltip title="Coming soon">
          <Select
            size="small"
            disabled
            prefix={<span className={styles.selectPrefix}>Env</span>}
            value="all"
            options={[{ value: "all", label: "all" }]}
            className={styles.select}
          />
        </Tooltip> */}
        <Select<SessionSort>
          size="small"
          prefix={<span className={styles.selectPrefix}>Sort</span>}
          value={sort}
          onChange={(value) => updateParams({ sort: value, page: 1 })}
          options={[
            { value: "newest", label: "Newest" },
            { value: "oldest", label: "Oldest" },
          ]}
          className={styles.select}
          popupMatchSelectWidth={false}
        />
        {selectedIds.length > 0 && (
          <Button
            size="small"
            danger
            icon={<Trash2 {...ICON} />}
            onClick={confirmDelete}
          >
            Delete {selectedIds.length}
          </Button>
        )}
      </div>

      {isError ? (
        <Alert
          className={styles.alert}
          type="error"
          title="Failed to load sessions."
          showIcon
        />
      ) : (
        <div ref={tableAreaRef} className={styles.tableArea}>
          <Table<SessionSummary>
            className={styles.table}
            columns={columns}
            dataSource={data?.items}
            rowKey="id"
            size="small"
            loading={isFetching}
            tableLayout="fixed"
            scroll={{ y: bodyHeight }}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
              columnWidth: 44,
            }}
            locale={{
              emptyText: search ? (
                `No sessions match “${search}”.`
              ) : scope === "errors" ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No sessions with errors."
                ></Empty>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No sessions yet."
                ></Empty>
              ),
            }}
            pagination={{
              current: page,
              pageSize,
              total: data?.totalCount,
              size: "small",
              showSizeChanger: true,
              showTotal: (total) => `${total} sessions`,
              onChange: (nextPage, nextPageSize) =>
                updateParams({
                  page: nextPageSize === pageSize ? nextPage : 1,
                  pageSize: nextPageSize,
                }),
            }}
            onRow={(record) => ({
              onClick: (e) => {
                // Ticking the checkbox or copying the ID should not open the session
                const target = e.target as HTMLElement;
                if (
                  target.closest(
                    ".ant-table-selection-column, .ant-typography-copy",
                  )
                )
                  return;
                navigate(`/sessions/${record.id}`);
              },
            })}
          />
        </div>
      )}
    </div>
  );
}
