// src/hooks/useTests.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  KindsResponse,
  StartRequest,
  StartResponse,
  SubmitRequest,
} from "@/lib/types";

export function useKinds() {
  return useQuery({
    queryKey: ["kinds"],
    queryFn: () => api.get<KindsResponse>("/tests/kinds"),
  });
}

export function useStartTest() {
  return useMutation({
    mutationKey: ["startTest"],
    mutationFn: (body: StartRequest) =>
      api.post<StartResponse>("/tests/start", body),
  });
}

export function useSubmitTest() {
  return useMutation({
    mutationKey: ["submitTest"],
    mutationFn: (body: SubmitRequest) =>
      api.post<{ score: number; total: number; details?: unknown }>(
        "/tests/submit",
        body
      ),
  });
}
