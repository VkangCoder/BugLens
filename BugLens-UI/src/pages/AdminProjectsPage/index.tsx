import { deleteProject, listProjects } from "@/api/projects";
import { parseApiProblem } from "@/api/problem";
import { useAuth } from "@/auth/useAuth";
import AdminPage from "@/components/AdminPage";
import Badge from "@/components/Badge";
import type { ProjectResponse } from "@/types/admin";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Input, Segmented, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import CreateProjectModal from "./CreateProjectModal";
import styles from "./AdminProjectsPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

type Scope = "all" | "needs-key";

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

export default function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const { isAdmin } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const projects = data ?? [];
  const needsKey = projects.filter((p) => p.myActiveKeyCount === 0);
  const term = search.trim().toLowerCase();
  const rows = (scope === "needs-key" ? needsKey : projects).filter((p) => p.name.toLowerCase().includes(term));

  function confirmDelete(project: ProjectResponse) {
    modal.confirm({
      title: `Delete project ${project.name}?`,
      content: `${plural(project.memberCount, "member")} lose access and every ingest key stops working at once. The ${plural(project.sessionCount, "recorded session")} are kept and show as "Deleted project". This can't be undone.`,
      okText: "Delete project",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteProject(project.id);
          message.success(`Project ${project.name} deleted.`);
          await queryClient.invalidateQueries({ queryKey: ["projects"] });
          await queryClient.invalidateQueries({ queryKey: ["sessions"] });
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't delete the project.").message);
        }
      },
    });
  }

  const columns: ColumnsType<ProjectResponse> = [
    {
      title: "Project",
      key: "project",
      render: (_, p) => (
        <div className={styles.cell}>
          <span className={styles.cellTitle}>{p.name}</span>
          <span className={styles.cellMeta}>
            <Tooltip title={formatDateTime(p.createdAt)}>created {formatRelative(p.createdAt)}</Tooltip>
            <span className={styles.metaIcon}>
              <Users size={12} strokeWidth={1.5} /> {p.memberCount}
            </span>
          </span>
        </div>
      ),
    },
    {
      title: "Sessions",
      key: "sessions",
      width: 170,
      render: (_, p) =>
        p.sessionCount === 0 ? (
          <span className={styles.muted}>None yet</span>
        ) : (
          <span className={styles.sessions}>
            <span className={styles.mono}>{p.sessionCount}</span>
            {p.errorSessionCount > 0 && (
              <Badge tone='danger' dot title='Sessions with at least one error'>
                {p.errorSessionCount} with errors
              </Badge>
            )}
          </span>
        ),
    },
    {
      title: "Last recorded",
      key: "last",
      width: 140,
      render: (_, p) =>
        p.lastSessionAt ? (
          <Tooltip title={formatDateTime(p.lastSessionAt)}>
            <span className={styles.secondary}>{formatRelative(p.lastSessionAt)}</span>
          </Tooltip>
        ) : (
          <span className={styles.muted}>—</span>
        ),
    },
    {
      title: "Your key",
      key: "key",
      width: 130,
      render: (_, p) =>
        p.myActiveKeyCount > 0 ? (
          <Badge tone='success' dot>
            {p.myActiveKeyCount > 1 ? `${p.myActiveKeyCount} active` : "Active"}
          </Badge>
        ) : (
          <Tooltip title='Open the project to create a key for the extension'>
            <span>
              <Badge tone='warning' dot>
                Missing
              </Badge>
            </span>
          </Tooltip>
        ),
    },
    ...(isAdmin
      ? [
          {
            title: "",
            key: "actions",
            width: 56,
            align: "right" as const,
            render: (_: unknown, project: ProjectResponse) => (
              <Tooltip title='Delete project'>
                <Button
                  size='small'
                  type='text'
                  danger
                  icon={<Trash2 {...ICON} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    confirmDelete(project);
                  }}
                  aria-label={`Delete project ${project.name}`}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <AdminPage
      title='Projects'
      subtitle={
        data && (
          <>
            <span>{plural(projects.length, "project")}</span>
            <span>
              {plural(
                projects.reduce((n, p) => n + p.sessionCount, 0),
                "session",
              )}
            </span>
            {needsKey.length > 0 && (
              <span className={styles.warningText}>You have no key for {plural(needsKey.length, "project")}</span>
            )}
          </>
        )
      }
      actions={
        isAdmin && (
          <Button type='primary' icon={<Plus {...ICON} />} onClick={() => setCreateOpen(true)}>
            New project
          </Button>
        )
      }
      toolbar={
        <>
          <Input
            size='small'
            allowClear
            className={styles.search}
            placeholder='Filter by name'
            prefix={<Search {...ICON} className={styles.searchIcon} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Segmented<Scope>
            size='small'
            value={scope}
            onChange={setScope}
            options={[
              {
                value: "all",
                label: (
                  <span className={styles.segment}>
                    All <span className={styles.segmentCount}>{projects.length}</span>
                  </span>
                ),
              },
              {
                value: "needs-key",
                label: (
                  <span className={styles.segment}>
                    Needs your key <span className={styles.segmentCount}>{needsKey.length}</span>
                  </span>
                ),
              },
            ]}
          />
        </>
      }
    >
      {isError && (
        <Alert
          className={styles.alert}
          type='error'
          showIcon
          title="Couldn't load projects."
          action={
            <Button size='small' onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
        />
      )}
      <Table<ProjectResponse>
        className={styles.table}
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={isPending && !isError}
        pagination={false}
        tableLayout='fixed'
        onRow={(project) => ({ onClick: () => navigate(`/projects/${encodeURIComponent(project.id)}`) })}
        locale={{
          emptyText: isError ? (
            "—"
          ) : term ? (
            `No projects match “${search.trim()}”.`
          ) : scope === "needs-key" ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='You have a key for every project.' />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                isAdmin
                  ? "No projects yet. Create one, then add the people who record bugs."
                  : "You aren't in any project yet. Ask an admin to add you."
              }
            />
          ),
        }}
      />

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(project) => {
          setCreateOpen(false);
          message.success(`Project ${project.name} created. Add members, then create your ingest key.`);
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
          navigate(`/projects/${encodeURIComponent(project.id)}`);
        }}
      />
    </AdminPage>
  );
}
