import { Alert, App, Button, Modal } from "antd";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import styles from "./SecretKeyModal.module.scss";

const ICON = { size: 14, strokeWidth: 1.5 };

interface SecretKeyModalProps {
  open: boolean;
  projectName: string;
  ingestKey: string;
  onClose: () => void;
}

/**
 * Hiển thị ingest key đúng một lần. Server chỉ lưu hash nên không có cách xem lại:
 * modal không đóng khi bấm nền / Esc để tránh mất key do thao tác nhầm.
 */
export default function SecretKeyModal({ open, projectName, ingestKey, onClose }: SecretKeyModalProps) {
  const { message } = App.useApp();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ingestKey);
      setCopied(true);
    } catch {
      message.error("Copy failed. Select the key and copy it manually.");
    }
  }

  return (
    <Modal
      open={open}
      title={`Ingest key for ${projectName}`}
      mask={{ closable: false }}
      keyboard={false}
      closable={false}
      destroyOnHidden
      afterClose={() => setCopied(false)}
      footer={
        <Button type="primary" onClick={onClose}>
          I've saved the key
        </Button>
      }
    >
      <Alert
        className={styles.alert}
        type="warning"
        showIcon
        title="This key is shown once."
        description="Only a hash is stored, so it can't be shown again. If you lose it, rotate the key."
      />
      <div className={styles.keyRow}>
        <code className={styles.key} data-testid="ingest-key">
          {ingestKey}
        </code>
        <Button
          icon={copied ? <Check {...ICON} /> : <Copy {...ICON} />}
          onClick={copy}
          aria-label="Copy ingest key"
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className={styles.hint}>
        Paste it into the extension, or send it as the <code>X-Api-Key</code> header. It can only write sessions.
      </p>
    </Modal>
  );
}
