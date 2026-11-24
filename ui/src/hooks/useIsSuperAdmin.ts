import { useQuery } from "@tanstack/react-query";
import { accessApi } from "@/api/access";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Whether the signed-in board is a super admin: an instance admin, or the
 * local trusted operator. Resolves to false while unknown. The server stays
 * authoritative; this only decides what to show.
 */
export function useIsSuperAdmin(): { isSuperAdmin: boolean; isLoading: boolean } {
  const access = useQuery({
    queryKey: queryKeys.access.currentBoardAccess,
    queryFn: () => accessApi.getCurrentBoardAccess(),
    staleTime: 30_000,
  });
  return {
    isSuperAdmin: access.data?.source === "local_implicit" || access.data?.isInstanceAdmin === true,
    isLoading: access.isLoading,
  };
}
