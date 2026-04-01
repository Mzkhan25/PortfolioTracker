import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { Tag, CreateTagRequest, UpdateTagRequest, TagAnalytics } from "@portfolio-tracker/shared";

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data } = await api.get("/tags");
      return data.data;
    },
  });
}

export function useTagPositions(tagId: string | null) {
  return useQuery({
    queryKey: ["tags", tagId, "positions"],
    queryFn: async () => {
      const { data } = await api.get(`/tags/${tagId}/positions`);
      return data.data as {
        tag: { id: string; name: string; color: string | null };
        positions: any[];
        analytics: TagAnalytics;
      };
    },
    enabled: !!tagId,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateTagRequest) => {
      const { data } = await api.post("/tags", body);
      return data.data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateTagRequest & { id: string }) => {
      const { data } = await api.put(`/tags/${id}`, body);
      return data.data as Tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/tags/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useTagPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, etoroPositionId }: { tagId: string; etoroPositionId: string }) => {
      const { data } = await api.post(`/tags/${tagId}/positions`, { etoroPositionId });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "positions"] });
    },
  });
}

export function useUntagPosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tagId, etoroPositionId }: { tagId: string; etoroPositionId: string }) => {
      await api.delete(`/tags/${tagId}/positions/${etoroPositionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio", "positions"] });
    },
  });
}
