import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExternalService,
  deleteExternalService,
  fetchExternalServices,
  updateExternalService,
  type ExternalServiceInput,
} from "./externalServicesApi";

const QUERY_KEY = ["external-services"] as const;

export function useExternalServices(search: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, search],
    queryFn: () => fetchExternalServices(search || undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const create = useMutation({
    mutationFn: (input: ExternalServiceInput) => createExternalService(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ExternalServiceInput> }) =>
      updateExternalService(id, input),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExternalService(id),
    onSuccess: invalidate,
  });

  return { services: query.data ?? [], status: query.status, create, update, remove };
}
