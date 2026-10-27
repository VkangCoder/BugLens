import { deleteUser, listUsers } from "@/api/users";
import { parseApiProblem } from "@/api/problem";
import AdminPage from "@/components/AdminPage";
import Badge from "@/components/Badge";
import { useAuth } from "@/auth/useAuth";
import type { UserResponse } from "@/types/admin";
import type { Role } from "@/types/auth";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Input, Segmented, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import CreateUserModal from "./CreateUserModal";
import styles from "./AdminUsersPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };
const MAX_PROJECT_TAGS = 2;
const STALE_DAYS = 30;

type Scope = "all" | Role;

function isStale(user: UserResponse): boolean {
  const last = user.lastLoginAt ?? user.createdAt;
  return Date.now() - new Date(last).getTime() > STALE_DAYS * 86_400_000;
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { user: me } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const users = data ?? [];
  const admins = users.filter((u) => u.role === "Admin");
  const devs = users.filter((u) => u.role === "Dev");
  const withoutProject = users.filter((u) => !u.projects?.length && u.role === "Dev");
  const term = search.trim().toLowerCase();
  const rows = users
    .filter((u) => scope === "all" || u.role === scope)
    .filter((u) => u.name.toLowerCase().includes(term));

  const isMe = (name: string) => !!me && me.name.toLowerCase() === name.toLowerCase();
  const isLastAdmin = (user: UserResponse) => user.role === "Admin" && admins.length <= 1;

  function confirmDelete(user: UserResponse) {
    const projectCount = user.projects?.length ?? 0;
    modal.confirm({
      title: `Delete user ${user.name}?`,
      content: `They can't sign in any more${projectCount > 0 ? `, leave ${projectCount} ${projectCount === 1 ? "project" : "projects"} and their ingest keys are revoked` : ""}. A dashboard tab they already have open keeps working until its token expires.`,
      okText: "Delete user",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await deleteUser(user.id);
          message.success(`User ${user.name} deleted.`);
          await queryClient.invalidateQueries({ queryKey: ["users"] });
          await queryClient.invalidateQueries({ queryKey: ["projects"] });
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't delete the user.").message);
        }
      },
    });
  }

  const columns: ColumnsType<UserResponse> = [
    {
      title: "User",
      key: "user",
      render: (_, u) => (
        <div className={styles.cell}>
          <span className={styles.cellTitle}>
            {u.name}
            {isMe(u.name) && <span className={styles.you}>you</span>}
          </span>
          <span className={styles.cellMeta}>
            <Tooltip title={formatDateTime(u.createdAt)}>created {formatRelative(u.createdAt)}</Tooltip>
          </span>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      width: 100,
      render: (_, u) => <Badge tone={u.role === "Admin" ? "accent" : "neutral"}>{u.role}</Badge>,
    },
    {
      title: "Projects",
      key: "projects",
      // A Dev outside every project can sign in but sees nothing and can't record
      render: (_, u) => {
        const projects = u.projects ?? [];
        if (projects.length === 0) {
          return u.role === "Admin" ? (
            <span className={styles.muted}>All, as admin</span>
          ) : (
            <Tooltip title='Add them to a project from its page'>
              <span>
                <Badge tone='warning' dot>
                  None
                </Badge>
              </span>
            </Tooltip>
          );
        }
        const shown = projects.slice(0, MAX_PROJECT_TAGS);
        const rest = projects.slice(MAX_PROJECT_TAGS);
        return (
          <span className={styles.projects}>
            {shown.map((p) => (
              <Link key={p.id} to={`/projects/${encodeURIComponent(p.id)}`} className={styles.projectLink}>
                {p.name}
              </Link>
            ))}
            {rest.length > 0 && (
              <Tooltip title={rest.map((p) => p.name).join(", ")}>
                <span className={styles.more}>+{rest.length}</span>
              </Tooltip>
            )}
          </span>
        );
      },
    },
    {
      title: "Last sign-in",
      key: "lastLogin",
      width: 140,
      render: (_, u) =>
        u.lastLoginAt ? (
          <Tooltip title={formatDateTime(u.lastLoginAt)}>
            <span className={isStale(u) ? styles.stale : styles.secondary}>{formatRelative(u.lastLoginAt)}</span>
          </Tooltip>
        ) : (
          <span className={isStale(u) ? styles.stale : styles.muted}>Never</span>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "right",
      render: (_, u) => {
        const blocked = isMe(u.name)
          ? "You can't delete your own account"
          : isLastAdmin(u)
            ? "The last admin can't be deleted"
            : null;
        return (
          <Tooltip title={blocked ?? "Delete user"}>
            <Button
              size='small'
              type='text'
              danger
              icon={<Trash2 {...ICON} />}
              disabled={blocked !== null}
              onClick={() => confirmDelete(u)}
              aria-label={`Delete user ${u.name}`}
            />
          </Tooltip>
        );
      },
    },
  ];

  return (
    <AdminPage
      title='Users'
      subtitle={
        data && (
          <>
            <span>
              {admins.length} {admins.length === 1 ? "admin" : "admins"} · {devs.length}{" "}
              {devs.length === 1 ? "dev" : "devs"}
            </span>
            {withoutProject.length > 0 && (
              <span className={styles.warningText}>
                {withoutProject.length} {withoutProject.length === 1 ? "dev is" : "devs are"} in no project
              </span>
            )}
          </>
        )
      }
      actions={
        <Button type='primary' icon={<Plus {...ICON} />} onClick={() => setCreateOpen(true)}>
          New user
        </Button>
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
              { value: "all", label: <Segment label='All' count={users.length} /> },
              { value: "Admin", label: <Segment label='Admin' count={admins.length} /> },
              { value: "Dev", label: <Segment label='Dev' count={devs.length} /> },
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
          title="Couldn't load users."
          action={
            <Button size='small' onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
        />
      )}
      <Table<UserResponse>
        className={styles.table}
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={isPending && !isError}
        pagination={false}
        tableLayout='fixed'
        locale={{ emptyText: isError ? "—" : term ? `No users match “${search.trim()}”.` : "No users." }}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(name) => {
          setCreateOpen(false);
          message.success(`User ${name} created. Add them to a project so they can record.`);
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
      />
    </AdminPage>
  );
}

function Segment({ label, count }: { label: string; count: number }) {
  return (
    <span className={styles.segment}>
      {label} <span className={styles.segmentCount}>{count}</span>
    </span>
  );
}
