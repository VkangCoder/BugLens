import { useQuery } from "@tanstack/react-query";
import { getSessions } from "@/api/sessions";

export function useSessionCount(hasErrors?: boolean, projectId?: string) {
  const { data } = useQuery({
    queryKey: ["sessions", "count", { hasErrors, projectId }],
    queryFn: () => getSessions({ pageSize: 1, hasErrors, projectId }),
  });
  return data?.totalCount;
}
