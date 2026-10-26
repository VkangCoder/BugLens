import { useAuth } from "@/auth/useAuth";
import Logo from "@/layouts/AppLayout/components/Logo";
import { Alert, Button, Checkbox, Form, Input, Tooltip, type InputRef } from "antd";
import { isAxiosError } from "axios";
import { Eye, EyeOff, Lock, Moon, ShieldCheck, Sun, User } from "lucide-react";
import { useRef, useState } from "react";
import { Navigate, useLocation } from "react-router";
import styles from "./LoginPage.module.scss";
import EventTraceBackground from "@/components/EventTraceBackground";
import { useTheme } from "@/theme/useTheme";

const ICON = { size: 14, strokeWidth: 1.5 };

interface LoginFormValues {
  name: string;
  password: string;
  remember: boolean;
}

function getRedirectTarget(state: unknown): string {
  if (typeof state === "object" && state !== null && "from" in state) {
    const from = state.from;
    if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) return from;
  }
  return "/";
}

function describeLoginError(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return "Can't reach the server. Check your connection.";
    switch (error.response.status) {
      case 401:
        return "Name or password is incorrect.";
      case 429:
        return "Too many attempts. Try again in a minute.";
    }
  }
  return "Sign-in failed. Try again.";
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form] = Form.useForm<LoginFormValues>();
  const passwordRef = useRef<InputRef>(null);
  const { isDark, toggleMode } = useTheme();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={getRedirectTarget(location.state)} replace />;

  async function handleFinish(values: LoginFormValues) {
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await login({ name: values.name.trim(), password: values.password }, values.remember);
    } catch (error: unknown) {
      setFormError(describeLoginError(error));
      form.setFieldValue("password", "");
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.themeToggle}>
        <Tooltip title={isDark ? "Switch to light theme" : "Switch to dark theme"} placement='left'>
          <Button
            type='text'
            size='small'
            icon={isDark ? <Sun {...ICON} /> : <Moon {...ICON} />}
            onClick={toggleMode}
            aria-label='Toggle theme'
          />
        </Tooltip>
      </div>
      <EventTraceBackground />
      <main className={styles.main}>
        <div className={styles.content}>
          <div className={styles.header_title}>
            <div>
              <h1 className={styles.title}>Sign in to BugLens</h1>
              <Logo size={30} wordmark={false} />
            </div>
            <p className={styles.subtitle}>Review sessions recorded by your team.</p>
          </div>

          <div className={styles.card}>
            {formError && <Alert className={styles.alert} type='error' showIcon title={formError} role='alert' />}

            <Form<LoginFormValues>
              form={form}
              layout='vertical'
              requiredMark={false}
              initialValues={{ remember: true }}
              onFinish={handleFinish}
              onValuesChange={() => formError && setFormError(null)}
              autoComplete='on'
            >
              <Form.Item
                name='name'
                label='Username'
                rules={[{ required: true, whitespace: true, message: "Enter your username" }]}
              >
                <Input
                  size='large'
                  prefix={<User {...ICON} className={styles.fieldIcon} />}
                  autoComplete='username'
                  autoCapitalize='none'
                  spellCheck={false}
                  placeholder='Enter your username'
                  autoFocus
                />
              </Form.Item>
              <Form.Item name='password' label='Password' rules={[{ required: true, message: "Enter your password" }]}>
                <Input.Password
                  ref={passwordRef}
                  size='large'
                  prefix={<Lock {...ICON} className={styles.fieldIcon} />}
                  autoComplete='current-password'
                  placeholder='Enter your password'
                  iconRender={(visible) => (visible ? <EyeOff {...ICON} /> : <Eye {...ICON} />)}
                />
              </Form.Item>
              <Form.Item name='remember' valuePropName='checked'>
                <Checkbox>Keep me signed in on this device</Checkbox>
              </Form.Item>
              <Button type='primary' htmlType='submit' size='large' block loading={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </Button>
            </Form>

            <p className={styles.hint}>Accounts are created by your team admin.</p>
          </div>

          <p className={styles.privacy}>
            <ShieldCheck {...ICON} className={styles.privacyIcon} />
            <span>Sign in with the account your workspace admin created</span>
          </p>
        </div>
      </main>
    </div>
  );
}
