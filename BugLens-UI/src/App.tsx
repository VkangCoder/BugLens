import AuthProvider from "@/auth/AuthProvider";
import RequireAdmin from "@/auth/RequireAdmin";
import RequireAuth from "@/auth/RequireAuth";
import AdminProjectsPage from "@/pages/AdminProjectsPage";
import AdminUsersPage from "@/pages/AdminUsersPage";
import LoginPage from "@/pages/LoginPage";
import SessionDetailPage from "@/pages/SessionDetailPage";
import SessionListPage from "@/pages/SessionListPage";
import ThemeProvider from "@/theme/ThemeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { BrowserRouter, Route, Routes } from "react-router";
import AppLayout from "./layouts/AppLayout";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path='login' element={<LoginPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route index element={<SessionListPage />} />
                  <Route path='sessions/:id' element={<SessionDetailPage />} />
                  <Route path='projects' element={<AdminProjectsPage />} />
                  <Route path='projects/:id' element={<ProjectDetailPage />} />
                  <Route path='admin' element={<RequireAdmin />}>
                    <Route path='users' element={<AdminUsersPage />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
