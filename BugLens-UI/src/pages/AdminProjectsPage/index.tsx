import { deleteProject, listProjects, rotateProjectKey } from "@/api/projects";
import { parseApiProblem } from "@/api/problem";
import AdminPage from "@/components/AdminPage";
import SecretKeyModal from "@/components/SecretKeyModal";
import type { ProjectResponse } from "@/types/admin";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import CreateProjectModal from "./CreateProjectModal";
import styles from "./AdminProjectsPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

interface RevealedKey {
  projectName: string;
  ingestKey: string;
}

export default function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<RevealedKey | null>(null);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  function confirmRotate(project: ProjectResponse) {
    modal.confirm({
      title: `Rotate the key for ${project.name}?`,
      content: "The current key stops working immediately. Extensions using it get 401 until you paste the new key.",
      okText: "Rotate key",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          const result = await rotateProjectKey(project.id);
          setRevealed({ projectName: result.name, ingestKey: result.ingestKey });
          await queryClient.invalidateQueries({ queryKey: ["projects"] });
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't rotate the key.").message);
        }
      },
    });
  }

  function confirmDelete(project: ProjectResponse) {
    modal.confirm({
      title: `Delete project ${project.name}?`,
      content:
        "Its ingest key stops working immediately. Sessions already recorded are kept and show as \"Deleted project\". This can't be undone.",
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
    { title: "Project", dataIndex: "name", key: "name", render: (name: string) => <strong>{name}</strong> },
    {
      title: "Ingest key",
      dataIndex: "keyPrefix",
      key: "key",
      render: (prefix: string) => <span className={styles.mono}>{prefix}…</span>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (iso: string) => <Tooltip title={formatDateTime(iso)}>{formatRelative(iso)}</Tooltip>,
    },
    {
      title: "Key rotated",
      dataIndex: "keyRotatedAt",
      key: "keyRotatedAt",
      render: (iso: string | null) =>
        iso ? <Tooltip title={formatDateTime(iso)}>{formatRelative(iso)}</Tooltip> : <span className={styles.muted}>Never</span>,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_: unknown, project) => (
        <span className={styles.actions}>
          <Button size="small" icon={<KeyRound {...ICON} />} onClick={() => confirmRotate(project)}>
            Rotate key
          </Button>
          <Tooltip title="Delete project">
            <Button
              size="small"
              danger
              icon={<Trash2 {...ICON} />}
              onClick={() => confirmDelete(project)}
              aria-label={`Delete project ${project.name}`}
            />
          </Tooltip>
        </span>
      ),
    },
  ];

  return (
    <AdminPage
      title="Projects"
      subtitle="Each project has one write-only ingest key. The extension uses it to send sessions."
      actions={
        <Button type="primary" icon={<Plus {...ICON} />} onClick={() => setCreateOpen(true)}>
          New project
        </Button>
      }
    >
      {isError && (
        <Alert
          className={styles.alert}
          type="error"
          showIcon
          title="Couldn't load projects."
          action={
            <Button size="small" onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
        />
      )}
      <Table<ProjectResponse>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={data}
        loading={isPending && !isError}
        pagination={false}
        locale={{ emptyText: isError ? "—" : "No projects yet. Create one to get an ingest key." }}
        scroll={{ x: "max-content" }}
      />

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(project) => {
          setCreateOpen(false);
          setRevealed({ projectName: project.name, ingestKey: project.ingestKey });
          void queryClient.invalidateQueries({ queryKey: ["projects"] });
        }}
      />
      <SecretKeyModal
        open={revealed !== null}
        projectName={revealed?.projectName ?? ""}
        ingestKey={revealed?.ingestKey ?? ""}
        onClose={() => setRevealed(null)}
      />
    </AdminPage>
  );
}
