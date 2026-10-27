import { listProjects } from "@/api/projects";
import { deleteSession, getSessions } from "@/api/sessions";
import { useAuth } from "@/auth/useAuth";
import { useElementHeight } from "@/hooks/useElementHeight";
import { useSessionCount } from "@/hooks/useSessionCount";
import type { SessionSort, SessionSummary } from "@/types/session";
import { formatDateTime, formatDuration, formatRelative, hostAndPath } from "@/utils/format";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Input, Pagination, Segmented, Select, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Check, Copy, Download, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import styles from "./SessionListPage.module.scss";

type Scope = "all" | "errors";

const DEFAULT_PAGE_SIZE = 10;

const TABLE_CHROME_HEIGHT = 34 + 48;
const ICON = { size: 14, strokeWidth: 1.5 };

const { Text } = Typography;

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
  const { isAdmin } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;
  const scope: Scope = searchParams.get("hasErrors") === "true" ? "errors" : "all";
  const search = searchParams.get("q") ?? "";
  const sort: SessionSort = searchParams.get("sort") === "oldest" ? "oldest" : "newest";
  const projectId = searchParams.get("project") ?? "";

  function updateParams(next: {
    page?: number;
    pageSize?: number;
    scope?: Scope;
    search?: string;
    sort?: SessionSort;
    projectId?: string;
  }) {
    const merged = { page, pageSize, scope, search, sort, projectId, ...next };
    const params = new URLSearchParams();
    if (merged.projectId) params.set("project", merged.projectId);
    if (merged.search) params.set("q", merged.search);
    if (merged.scope === "errors") params.set("hasErrors", "true");
    if (merged.sort !== "newest") params.set("sort", merged.sort);
    if (merged.page > 1) params.set("page", String(merged.page));
    if (merged.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(merged.pageSize));
    setSearchParams(params);
  }

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => updateParams({ search: searchInput.trim(), page: 1 }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const params = {
    page,
    pageSize,
    hasErrors: scope === "errors" ? true : undefined,
    search: search || undefined,
    sort,
    projectId: projectId || undefined,
  };

  // Name for the project filter chip (opened from a project page)
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
    enabled: !!projectId,
  });
  const projectName = projects?.find((p) => p.id === projectId)?.name;

  const { data, isFetching, isError } = useQuery({
    queryKey: ["sessions", params],
    queryFn: () => getSessions(params),
    placeholderData: keepPreviousData,
  });

  // Counts follow the project filter, so "All 3 · Errors 1" describes the rows below
  const totalCount = useSessionCount(undefined, projectId || undefined);
  const errorCount = useSessionCount(true, projectId || undefined);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // The table fills the rest of the screen: header and pagination stay put, rows scroll
  const [tableAreaRef, tableAreaHeight] = useElementHeight<HTMLDivElement>();
  const bodyHeight = Math.max(120, tableAreaHeight - TABLE_CHROME_HEIGHT);

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map(deleteSession)),
    onSuccess: (_, ids) => {
      message.success(`${ids.length} ${ids.length === 1 ? "session" : "sessions"} deleted.`);
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: () => message.error("Delete failed. Nothing was removed on your side."),
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
                icon: [<Copy key='copy' {...ICON} />, <Check key='done' {...ICON} />],
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
    // Every row has the same project while filtering by one, so the column would say nothing
    ...(projectId
      ? []
      : [
          {
            title: "Project",
            key: "project",
            width: 140,
            render: (_: unknown, s: SessionSummary) => (
              <Tooltip title={s.projectName ? undefined : `Project ${s.projectId} no longer exists`}>
                <Tag className={styles.project}>{s.projectName ?? "Deleted project"}</Tag>
              </Tooltip>
            ),
          },
        ]),
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
      render: (count: number) => <span className={styles.mono}>{count} events</span>,
    },
    {
      title: "Duration",
      key: "duration",
      width: 90,
      render: (_, s) => <span className={styles.mono}>{formatDuration(s.startedAt, s.endedAt)}</span>,
    },
    {
      title: "Recorded",
      dataIndex: "startedAt",
      key: "recorded",
      width: 110,
      align: "right",
      fixed: "right",
      render: (startedAt: string) => (
        <Tooltip title={formatDateTime(startedAt)} placement='left'>
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
            {projectId
              ? `Recorded into ${projectName ?? "this project"} by its members' extensions.`
              : "Recorded by the BugLens extension in the projects you belong to."}
          </p>
        </div>
        <Button size='small' icon={<Download {...ICON} />} onClick={exportPage} disabled={!data?.items.length}>
          Export
        </Button>
      </header>

      <div className={styles.toolbar}>
        <Input
          size='small'
          allowClear
          className={styles.search}
          placeholder='Filter by URL or session ID'
          prefix={<Search {...ICON} className={styles.searchIcon} />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {projectId && (
          <Tooltip title='Show sessions from every project'>
            <Button
              size='small'
              className={styles.filterChip}
              icon={<X {...ICON} />}
              iconPlacement='end'
              onClick={() => updateParams({ projectId: "", page: 1 })}
            >
              Project: {projectName ?? "…"}
            </Button>
          </Tooltip>
        )}
        <Segmented<Scope>
          size='small'
          value={scope}
          onChange={(value) => updateParams({ scope: value, page: 1 })}
          options={[
            {
              value: "all",
              label: (
                <span className={styles.segment}>
                  All <span className={styles.segmentCount}>{totalCount ?? ""}</span>
                </span>
              ),
            },
            {
              value: "errors",
              label: (
                <span className={styles.segment}>
                  Errors <span className={styles.segmentCount}>{errorCount ?? ""}</span>
                </span>
              ),
            },
          ]}
        />
        <div className={styles.toolbarSpacer} />
        <Tooltip title='Coming soon'>
          <Select
            size='small'
            disabled
            prefix={<span className={styles.selectPrefix}>Env</span>}
            value='all'
            options={[{ value: "all", label: "all" }]}
            className={styles.select}
          />
        </Tooltip>
        <Select<SessionSort>
          size='small'
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
        {isAdmin && selectedIds.length > 0 && (
          <Button size='small' danger icon={<Trash2 {...ICON} />} onClick={confirmDelete}>
            Delete {selectedIds.length}
          </Button>
        )}
      </div>

      {isError ? (
        <Alert className={styles.alert} type='error' title='Failed to load sessions.' showIcon />
      ) : (
        <div ref={tableAreaRef} className={styles.tableArea}>
          <div className={styles.tableWrap}>
            <Table<SessionSummary>
              className={styles.table}
              columns={columns}
              dataSource={data?.items}
              rowKey='id'
              size='small'
              loading={isFetching}
              tableLayout='fixed'
              scroll={{ y: bodyHeight }}
              rowSelection={
                isAdmin
                  ? {
                      selectedRowKeys: selectedIds,
                      onChange: (keys) => setSelectedIds(keys as string[]),
                      columnWidth: 44,
                    }
                  : undefined
              }
              pagination={false}
              locale={{
                emptyText: search ? (
                  `No sessions match “${search}”.`
                ) : scope === "errors" ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='No sessions with errors.'></Empty>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='No sessions yet.'></Empty>
                ),
              }}
              onRow={(record) => ({
                onClick: (e) => {
                  // Ticking the checkbox or copying the ID should not open the session
                  const target = e.target as HTMLElement;
                  if (target.closest(".ant-table-selection-column, .ant-typography-copy")) return;
                  navigate(`/sessions/${record.id}`);
                },
              })}
            />
          </div>

          <div className={styles.pager}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={data?.totalCount}
              size='small'
              showSizeChanger
              showTotal={(total) => `${total} sessions`}
              onChange={(nextPage, nextPageSize) =>
                updateParams({
                  page: nextPageSize === pageSize ? nextPage : 1,
                  pageSize: nextPageSize,
                })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
