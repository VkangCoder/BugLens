import { useQuery } from "@tanstack/react-query";
import { getSessions } from "@/api/sessions";

export function useSessionCount(hasErrors?: boolean) {
  const { data } = useQuery({
    queryKey: ["sessions", "count", { hasErrors }],
    queryFn: () => getSessions({ pageSize: 1, hasErrors }),
  });
  return data?.totalCount;
}
