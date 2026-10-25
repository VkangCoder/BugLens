import { parseApiProblem } from "@/api/problem";
import { createUser } from "@/api/users";
import { ROLES, type Role } from "@/types/auth";
import { Form, Input, Modal, Select } from "antd";
import { useState } from "react";

const FORM_ID = "create-user-form";
const FIELDS = ["name", "password", "role"] as const;

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
}

interface FormValues {
  name: string;
  password: string;
  role: Role;
}

export default function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish(values: FormValues) {
    setSubmitting(true);
    try {
      const user = await createUser({ name: values.name.trim(), password: values.password, role: values.role });
      onCreated(user.name);
    } catch (error: unknown) {
      const problem = parseApiProblem(error, "Couldn't create the user.");
      const fields = FIELDS.filter((field) => problem.fieldErrors[field]).map((field) => ({
        name: field,
        errors: [problem.fieldErrors[field]],
      }));
      form.setFields(fields.length > 0 ? fields : [{ name: "name", errors: [problem.message] }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title='New user'
      okText='Create user'
      okButtonProps={{ htmlType: "submit", form: FORM_ID }}
      confirmLoading={submitting}
      onCancel={onClose}
      afterClose={() => form.resetFields()}
      destroyOnHidden
    >
      <Form<FormValues>
        id={FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={false}
        initialValues={{ role: "Dev" }}
        onFinish={handleFinish}
      >
        <Form.Item
          name='name'
          label='Name'
          extra="3–50 characters: letters, digits, '.', '_' or '-'. Used to sign in."
          rules={[
            { required: true, message: "Enter a name" },
            { pattern: /^[\p{L}\p{N}._-]{3,50}$/u, message: "3–50 characters: letters, digits, '.', '_' or '-'" },
          ]}
        >
          <Input autoFocus autoComplete='off' autoCapitalize='none' spellCheck={false} />
        </Form.Item>

        <Form.Item
          name='password'
          label='Password'
          extra="Share it with the user directly. They can't change it yet."
          rules={[
            { required: true, message: "Enter a password" },
            { min: 6, max: 128, message: "Use 6–128 characters" },
          ]}
        >
          <Input.Password autoComplete='new-password' />
        </Form.Item>

        <Form.Item
          name='role'
          label='Role'
          extra='Dev reads and triages sessions. Admin can also delete data and manage projects and users.'
        >
          <Select<Role> options={ROLES.map((role) => ({ value: role, label: role }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
