import { request } from "./api";
import type { CreateReportInput, UpdateReportInput } from "../types";

export const createReport = (input: CreateReportInput) =>
  request<{ message: string }>(`/reports`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateReport = (id: string, input: UpdateReportInput) =>
  request<{ message: string }>(`/reports/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
