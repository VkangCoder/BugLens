import { addProjectMember, removeProjectMember } from "@/api/projectAccess";
import type { IngestKeyResponse, ProjectMemberResponse } from "@/api/projectAccess";
import { parseApiProblem } from "@/api/problem";
import { listUsers } from "@/api/users";
import { useAuth } from "@/auth/useAuth";
import Badge from "@/components/Badge";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Modal, Select, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus, UserMinus } from "lucide-react";
import { useState } from "react";
import styles from "./ProjectDetailPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };
const FORM_ID = "add-project-member-form";

interface MembersSectionProps {
  projectId: string;
  members: ProjectMemberResponse[];
  keys: IngestKeyResponse[];
  myId: string | undefined;
  loading: boolean;
}

export default function MembersSection({ projectId, members, keys, myId, loading }: MembersSectionProps) {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { isAdmin } = useAuth();
  const [form] = Form.useForm<{ userId: string }>();
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: listUsers, enabled: isAdmin && addOpen });
  const candidates = (usersQuery.data ?? []).filter((u) => !members.some((m) => m.userId === u.id));

  // Only admins receive every member's keys, so only they can see who still has none
  const activeKeysOf = (userId: string) => keys.filter((k) => k.ownerUserId === userId && !k.revokedAt).length;
  const withoutKey = members.filter((m) => activeKeysOf(m.userId) === 0).length;
  const nameOf = (userId: string) => members.find((m) => m.userId === userId)?.userName ?? "a former member";

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project-members", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["project-keys", projectId] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
    ]);
  }

  async function handleAdd(values: { userId: string }) {
    setSubmitting(true);
    try {
      await addProjectMember(projectId, values.userId);
      setAddOpen(false);
      message.success("Member added. They can now create their own key.");
      await refresh();
    } catch (error: unknown) {
      form.setFields([{ name: "userId", errors: [parseApiProblem(error, "Couldn't add the member.").message] }]);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmRemove(member: ProjectMemberResponse) {
    const keyCount = activeKeysOf(member.userId);
    modal.confirm({
      title: `Remove ${member.userName} from this project?`,
      content: `They lose access to its sessions${keyCount > 0 ? ` and their ${keyCount} active ${keyCount === 1 ? "key is" : "keys are"} revoked` : ""}. Their account stays.`,
      okText: "Remove member",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await removeProjectMember(projectId, member.userId);
          message.success(`${member.userName} removed.`);
          await refresh();
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't remove the member.").message);
        }
      },
    });
  }

  const columns: ColumnsType<ProjectMemberResponse> = [
    {
      title: "Member",
      key: "member",
      render: (_, m) => (
        <div className={styles.cell}>
          <span className={styles.cellTitle}>
            {m.userName}
            {m.userId === myId && <span className={styles.you}>you</span>}
          </span>
          <span className={styles.cellMeta}>
            <Tooltip title={formatDateTime(m.createdAt)}>
              added {formatRelative(m.createdAt)}
              {m.addedByUserId !== m.userId && ` by ${m.addedByUserId === myId ? "you" : nameOf(m.addedByUserId)}`}
            </Tooltip>
          </span>
        </div>
      ),
    },
    {
      title: "Role",
      key: "role",
      width: 100,
      render: (_, m) => <Badge tone={m.role === "Admin" ? "accent" : "neutral"}>{m.role}</Badge>,
    },
    ...(isAdmin
      ? [
          {
            title: "Keys",
            key: "keys",
            width: 130,
            render: (_: unknown, m: ProjectMemberResponse) => {
              const count = activeKeysOf(m.userId);
              return count > 0 ? (
                <span className={styles.mono}>{count} active</span>
              ) : (
                <Tooltip title="Can't record yet: they need to create a key on this page">
                  <span>
                    <Badge tone='warning' dot>
                      No key
                    </Badge>
                  </span>
                </Tooltip>
              );
            },
          },
          {
            title: "",
            key: "actions",
            width: 56,
            align: "right" as const,
            render: (_: unknown, m: ProjectMemberResponse) => (
              <Tooltip title='Remove from project'>
                <Button
                  size='small'
                  type='text'
                  danger
                  icon={<UserMinus {...ICON} />}
                  onClick={() => confirmRemove(m)}
                  aria-label={`Remove ${m.userName}`}
                />
              </Tooltip>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          Members <span className={styles.sectionCount}>{members.length}</span>
        </h2>
        <span className={styles.sectionHint}>
          {isAdmin && withoutKey > 0
            ? `${withoutKey} without a key can't record yet.`
            : "Members see this project's sessions and create their own keys."}
        </span>
        <span className={styles.spacer} />
        {isAdmin && (
          <Button size='small' icon={<Plus {...ICON} />} onClick={() => setAddOpen(true)}>
            Add member
          </Button>
        )}
      </div>

      <Table<ProjectMemberResponse>
        className={styles.table}
        rowKey='userId'
        size='small'
        columns={columns}
        dataSource={members}
        loading={loading}
        pagination={false}
        tableLayout='fixed'
        locale={{ emptyText: <span className={styles.muted}>No members yet.</span> }}
      />

      <Modal
        open={addOpen}
        title='Add member'
        okText='Add member'
        okButtonProps={{ htmlType: "submit", form: FORM_ID }}
        confirmLoading={submitting}
        onCancel={() => setAddOpen(false)}
        afterClose={() => form.resetFields()}
        destroyOnHidden
      >
        <Form<{ userId: string }> id={FORM_ID} form={form} layout='vertical' requiredMark={false} onFinish={handleAdd}>
          <Form.Item
            name='userId'
            label='User'
            extra='They can see this project’s sessions and create their own ingest key.'
            rules={[{ required: true, message: "Choose a user" }]}
          >
            <Select
              showSearch
              autoFocus
              optionFilterProp='label'
              loading={usersQuery.isPending}
              placeholder={
                candidates.length || usersQuery.isPending ? "Search by name" : "Everyone is already a member"
              }
              disabled={!usersQuery.isPending && candidates.length === 0}
              options={candidates.map((u) => ({ value: u.id, label: `${u.name} · ${u.role}` }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
