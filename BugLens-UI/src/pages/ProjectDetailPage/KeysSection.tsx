import { createIngestKey, revokeIngestKey } from "@/api/projectAccess";
import type { CreatedIngestKeyResponse, IngestKeyResponse, ProjectMemberResponse } from "@/api/projectAccess";
import { parseApiProblem } from "@/api/problem";
import { useAuth } from "@/auth/useAuth";
import Badge from "@/components/Badge";
import SecretKeyModal from "@/components/SecretKeyModal";
import type { ProjectResponse } from "@/types/admin";
import { formatDateTime, formatRelative } from "@/utils/format";
import { useQueryClient } from "@tanstack/react-query";
import { App, Button, Checkbox, Form, Input, Modal, Table, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import styles from "./ProjectDetailPage.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };
const FORM_ID = "create-ingest-key-form";

interface KeysSectionProps {
  project: ProjectResponse;
  keys: IngestKeyResponse[];
  members: ProjectMemberResponse[];
  myId: string | undefined;
  loading: boolean;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

// Admins see every member's keys; members only their own (the API filters)
export default function KeysSection({
  project,
  keys,
  members,
  myId,
  loading,
  createOpen,
  onCreateOpenChange,
}: KeysSectionProps) {
  const queryClient = useQueryClient();
  const { modal, message } = App.useApp();
  const { isAdmin } = useAuth();
  const [form] = Form.useForm<{ name: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);
  const [revealed, setRevealed] = useState<CreatedIngestKeyResponse | null>(null);

  const active = keys.filter((k) => !k.revokedAt);
  const revokedCount = keys.length - active.length;
  const rows = showRevoked ? keys : active;
  const nameOf = (userId: string) =>
    userId === myId ? "You" : (members.find((m) => m.userId === userId)?.userName ?? "Former member");

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["project-keys", project.id] }),
      queryClient.invalidateQueries({ queryKey: ["projects"] }),
    ]);
  }

  async function handleCreate(values: { name: string }) {
    setSubmitting(true);
    try {
      const created = await createIngestKey(project.id, values.name.trim());
      onCreateOpenChange(false);
      setRevealed(created);
      await refresh();
    } catch (error: unknown) {
      form.setFields([{ name: "name", errors: [parseApiProblem(error, "Couldn't create the key.").message] }]);
    } finally {
      setSubmitting(false);
    }
  }

  function confirmRevoke(key: IngestKeyResponse) {
    const owner = nameOf(key.ownerUserId);
    modal.confirm({
      title: `Revoke "${key.name}"?`,
      content:
        owner === "You"
          ? "The extension using this key gets 401 on its next upload. Create a new key if you still record on that browser."
          : `${owner}'s extension using this key gets 401 on its next upload. They can create a new key themselves.`,
      okText: "Revoke key",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await revokeIngestKey(project.id, key.id);
          message.success("Key revoked.");
          await refresh();
        } catch (error: unknown) {
          message.error(parseApiProblem(error, "Couldn't revoke the key.").message);
        }
      },
    });
  }

  const columns: ColumnsType<IngestKeyResponse> = [
    {
      title: "Key",
      key: "key",
      render: (_, key) => (
        <div className={styles.cell}>
          <span className={styles.cellTitle}>{key.name}</span>
          <span className={styles.cellMeta}>{key.keyPrefix}…</span>
        </div>
      ),
    },
    ...(isAdmin
      ? [
          {
            title: "Owner",
            key: "owner",
            width: 150,
            render: (_: unknown, key: IngestKeyResponse) => (
              <span className={styles.secondary}>{nameOf(key.ownerUserId)}</span>
            ),
          },
        ]
      : []),
    {
      title: "Last used",
      key: "lastUsed",
      width: 130,
      // "Never used" on an active key means the extension was never set up with it
      render: (_, key) =>
        key.lastUsedAt ? (
          <Tooltip title={formatDateTime(key.lastUsedAt)}>
            <span className={styles.secondary}>{formatRelative(key.lastUsedAt)}</span>
          </Tooltip>
        ) : (
          <span className={styles.muted}>Never used</span>
        ),
    },
    {
      title: "Created",
      key: "created",
      width: 120,
      render: (_, key) => (
        <Tooltip title={formatDateTime(key.createdAt)}>
          <span className={styles.muted}>{formatRelative(key.createdAt)}</span>
        </Tooltip>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, key) =>
        key.revokedAt ? (
          <Tooltip title={`Revoked ${formatDateTime(key.revokedAt)}`}>
            <span>
              <Badge>Revoked</Badge>
            </span>
          </Tooltip>
        ) : (
          <Badge tone='success' dot>
            Active
          </Badge>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 56,
      align: "right",
      render: (_, key) =>
        !key.revokedAt && (
          <Tooltip title='Revoke key'>
            <Button
              size='small'
              type='text'
              danger
              icon={<Trash2 {...ICON} />}
              onClick={() => confirmRevoke(key)}
              aria-label={`Revoke ${key.name}`}
            />
          </Tooltip>
        ),
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          {isAdmin ? "Ingest keys" : "Your ingest keys"} <span className={styles.sectionCount}>{active.length}</span>
        </h2>
        <span className={styles.sectionHint}>One per browser profile that records. Shown once when created.</span>
        <span className={styles.spacer} />
        {revokedCount > 0 && (
          <Checkbox checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)}>
            <span className={styles.secondary}>Show revoked ({revokedCount})</span>
          </Checkbox>
        )}
        <Button size='small' icon={<Plus {...ICON} />} onClick={() => onCreateOpenChange(true)}>
          New key
        </Button>
      </div>

      <Table<IngestKeyResponse>
        className={styles.table}
        rowKey='id'
        size='small'
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        tableLayout='fixed'
        rowClassName={(key) => (key.revokedAt ? styles.revokedRow : "")}
        locale={{ emptyText: <span className={styles.muted}>No active keys.</span> }}
      />

      <Modal
        open={createOpen}
        title={`New key for ${project.name}`}
        okText='Create key'
        okButtonProps={{ htmlType: "submit", form: FORM_ID }}
        confirmLoading={submitting}
        onCancel={() => onCreateOpenChange(false)}
        afterClose={() => form.resetFields()}
        destroyOnHidden
      >
        <Form<{ name: string }> id={FORM_ID} form={form} layout='vertical' requiredMark={false} onFinish={handleCreate}>
          <Form.Item
            name='name'
            label='Label'
            extra='Where this key lives, so you know which one to revoke later.'
            rules={[
              { required: true, whitespace: true, message: "Enter a label" },
              { max: 80, message: "Use at most 80 characters" },
            ]}
          >
            <Input autoFocus autoComplete='off' placeholder='work laptop · Chrome' maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>

      <SecretKeyModal
        open={revealed !== null}
        projectName={`${project.name} · ${revealed?.name ?? ""}`}
        ingestKey={revealed?.secret ?? ""}
        onClose={() => setRevealed(null)}
      />
    </section>
  );
}
