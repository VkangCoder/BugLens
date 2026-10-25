import { createProject } from "@/api/projects";
import { parseApiProblem } from "@/api/problem";
import type { ProjectWithKeyResponse } from "@/types/admin";
import { Form, Input, Modal } from "antd";
import { useState } from "react";

const FORM_ID = "create-project-form";

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectWithKeyResponse) => void;
}

interface FormValues {
  name: string;
}

export default function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish(values: FormValues) {
    setSubmitting(true);
    try {
      onCreated(await createProject(values.name.trim()));
    } catch (error: unknown) {
      const problem = parseApiProblem(error, "Couldn't create the project.");
      form.setFields([{ name: "name", errors: [problem.fieldErrors.name ?? problem.message] }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title='New project'
      okText='Create project'
      okButtonProps={{ htmlType: "submit", form: FORM_ID }}
      confirmLoading={submitting}
      onCancel={onClose}
      afterClose={() => form.resetFields()}
      destroyOnHidden
    >
      <Form<FormValues> id={FORM_ID} form={form} layout='vertical' requiredMark={false} onFinish={handleFinish}>
        <Form.Item
          name='name'
          label='Name'
          extra='One project per app or environment you want to record.'
          rules={[
            { required: true, whitespace: true, message: "Enter a project name" },
            { min: 2, max: 100, message: "Use 2–100 characters" },
          ]}
        >
          <Input autoFocus autoComplete='off' />
        </Form.Item>
      </Form>
    </Modal>
  );
}
