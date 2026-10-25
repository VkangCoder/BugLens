import { listUsers } from "@/api/users";
import AdminPage from "@/components/AdminPage";
import { useAuth } from "@/auth/useAuth";
import type { UserResponse } from "@/types/admin";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus } from "lucide-react";
import { useState } from "react";
import CreateUserModal from "./CreateUserModal";
import styles from "./AdminUsersPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { user: me } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isPending, isError, refetch, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const columns: ColumnsType<UserResponse> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <span>
          <strong>{name}</strong>
          {me && me.name.toLowerCase() === name.toLowerCase() && <span className={styles.you}>you</span>}
        </span>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: UserResponse["role"]) => (
        <span className={`${styles.role} ${role === "Admin" ? styles.roleAdmin : ""}`}>{role}</span>
      ),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (iso: string) => <Tooltip title={formatDateTime(iso)}>{formatRelative(iso)}</Tooltip>,
    },
  ];

  return (
    <AdminPage
      title="Users"
      subtitle="People who can sign in to this dashboard. Accounts are created here, not self-registered."
      actions={
        <Button type="primary" icon={<Plus {...ICON} />} onClick={() => setCreateOpen(true)}>
          New user
        </Button>
      }
    >
      {isError && (
        <Alert
          className={styles.alert}
          type="error"
          showIcon
          title="Couldn't load users."
          action={
            <Button size="small" onClick={() => void refetch()} loading={isFetching}>
              Retry
            </Button>
          }
        />
      )}
      <Table<UserResponse>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={data}
        loading={isPending && !isError}
        pagination={false}
        locale={{ emptyText: isError ? "—" : "No users." }}
        scroll={{ x: "max-content" }}
      />

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(name) => {
          setCreateOpen(false);
          message.success(`User ${name} created.`);
          void queryClient.invalidateQueries({ queryKey: ["users"] });
        }}
      />
    </AdminPage>
  );
}
