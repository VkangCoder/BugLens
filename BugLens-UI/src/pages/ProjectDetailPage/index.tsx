import { listIngestKeys, listProjectMembers } from "@/api/projectAccess";
import { deleteProject, listProjects } from "@/api/projects";
import { parseApiProblem } from "@/api/problem";
import { useAuth } from "@/auth/useAuth";
import AdminPage from "@/components/AdminPage";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Empty, Spin, Tooltip } from "antd";
import { ArrowLeft, KeyRound, List, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import KeysSection from "./KeysSection";
import MembersSection from "./MembersSection";
import styles from "./ProjectDetailPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

function plural(n: number, word: string): string {
  return `${n} ${n === 1 ? word : `${word}s`}`;
}

export default function ProjectDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { user, isAdmin } = useAuth();
  const [keyModalOpen, setKeyModalOpen] = useState(false);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const membersQuery = useQuery({
    queryKey: ["project-members", id],
    queryFn: () => listProjectMembers(id),
    enabled: Boolean(id),
  });
  const keysQuery = useQuery({
    queryKey: ["project-keys", id],
    queryFn: () => listIngestKeys(id),
    enabled: Boolean(id),
  });

  const project = projectsQuery.data?.find((item) => item.id === id);
  const members = membersQuery.data ?? [];
  const keys = keysQuery.data ?? [];

  // The token has no user id; the member list ties the signed-in name to one
  const myId = members.find((m) => m.userName.toLowerCase() === user?.name.toLowerCase())?.userId;
  const myActiveKeys = keys.filter((k) => !k.revokedAt && (!isAdmin || k.ownerUserId === myId)).length;

  function confirmDeleteProject() {
    if (!project) return;
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
          navigate("/projects");
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't delete the project.").message);
        }
      },
    });
  }

  if (projectsQuery.isPending) {
    return (
      <div className={styles.center}>
        <Spin />
      </div>
    );
  }

  if (projectsQuery.isError || !project) {
    return (
      <div className={styles.center}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="This project doesn't exist, or you aren't a member of it."
        >
          <Button icon={<ArrowLeft {...ICON} />} onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </Empty>
      </div>
    );
  }

  const sessionsUrl = `/?project=${encodeURIComponent(project.id)}`;

  return (
    <AdminPage
      title={project.name}
      subtitle={
        <>
          <Tooltip title={formatDateTime(project.createdAt)}>
            <span>Created {formatRelative(project.createdAt)}</span>
          </Tooltip>
          <Link to={sessionsUrl}>{plural(project.sessionCount, "session")}</Link>
          {project.errorSessionCount > 0 && (
            <Link className={styles.dangerLink} to={`${sessionsUrl}&hasErrors=true`}>
              {project.errorSessionCount} with errors
            </Link>
          )}
          {project.lastSessionAt && (
            <Tooltip title={formatDateTime(project.lastSessionAt)}>
              <span>Last recorded {formatRelative(project.lastSessionAt)}</span>
            </Tooltip>
          )}
        </>
      }
      actions={
        <>
          <Button icon={<List {...ICON} />} onClick={() => navigate(sessionsUrl)}>
            View sessions
          </Button>
          {isAdmin && (
            <Tooltip title='Delete project'>
              <Button danger icon={<Trash2 {...ICON} />} onClick={confirmDeleteProject} aria-label='Delete project' />
            </Tooltip>
          )}
        </>
      }
    >
      {(membersQuery.isError || keysQuery.isError) && (
        <Alert
          className={styles.alert}
          type='error'
          showIcon
          title="Couldn't load members or keys."
          action={
            <Button
              size='small'
              onClick={() => {
                void membersQuery.refetch();
                void keysQuery.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      )}

      {/* Shown until the signed-in user can record into this project */}
      {keysQuery.isSuccess && membersQuery.isSuccess && myActiveKeys === 0 && (
        <div className={styles.setup}>
          <KeyRound size={16} strokeWidth={1.5} className={styles.setupIcon} />
          <div className={styles.setupText}>
            <strong>You can't record into {project.name} yet.</strong>
            <span>
              {myId
                ? "Create a key, then paste it into the BugLens extension popup under Ingest Key."
                : "Only members can create keys. Add yourself under Members first."}
            </span>
          </div>
          {myId && (
            <Button type='primary' size='small' onClick={() => setKeyModalOpen(true)}>
              Create your key
            </Button>
          )}
        </div>
      )}

      <KeysSection
        project={project}
        keys={keys}
        members={members}
        myId={myId}
        loading={keysQuery.isPending}
        createOpen={keyModalOpen}
        onCreateOpenChange={setKeyModalOpen}
      />

      <MembersSection
        projectId={project.id}
        members={members}
        keys={keys}
        myId={myId}
        loading={membersQuery.isPending}
      />
    </AdminPage>
  );
}
