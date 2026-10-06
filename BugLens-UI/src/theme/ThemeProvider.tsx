import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { App, ConfigProvider } from "antd";
import { darkTheme } from "@/theme/darkTheme";
import { lightTheme } from "@/theme/lightTheme";
import { ThemeContext, type ThemeMode } from "@/theme/ThemeContext";

const STORAGE_KEY = "buglens-theme";
const DEFAULT_MODE: ThemeMode = "dark";

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked (private mode) — theme still works for this visit
    }
  }, [mode]);

  const toggleMode = useCallback(
    () => setMode((prev) => (prev === "dark" ? "light" : "dark")),
    [],
  );

  const value = useMemo(
    () => ({ mode, isDark: mode === "dark", setMode, toggleMode }),
    [mode, toggleMode],
  );

  return (
    <ThemeContext value={value}>
      <ConfigProvider theme={mode === "dark" ? darkTheme : lightTheme}>
        {/* antd <App> exposes theme colors as CSS variables (var(--ant-color-primary), ...) to everything inside */}
        <App className="app-root">{children}</App>
      </ConfigProvider>
    </ThemeContext>
  );
}
