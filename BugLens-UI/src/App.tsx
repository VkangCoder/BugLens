import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router";
import SessionListPage from "@/pages/SessionListPage";
import SessionDetailPage from "@/pages/SessionDetailPage";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SessionListPage />} />
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
