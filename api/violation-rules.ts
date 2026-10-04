import { request } from "./api";
import type { ViolationRuleListResponse, ViolationRuleResponse } from "../types";

// Danh sách rule đang bật để đổ dropdown khi report (lọc theo loại target).
export const getViolationRules = (targetType?: "post" | "comment" | "user", keyword?: string) => {
  const params = new URLSearchParams();
  if (targetType) params.set("target_type", targetType);
  if (keyword) params.set("keyword", keyword);
  const qs = params.toString();
  return request<ViolationRuleListResponse>(`/violation-rules${qs ? `?${qs}` : ""}`);
};

export const getViolationRule = (id: string) =>
  request<ViolationRuleResponse>(`/violation-rules/${id}`);
