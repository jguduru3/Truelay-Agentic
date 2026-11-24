import type {
  AgentStudioPreviewRequest,
  AgentStudioPreviewResponse,
  AgentStudioStatus,
} from "@paperclipai/shared";
import { api } from "./client";

export const agentStudioApi = {
  status: (companyId: string) =>
    api.get<AgentStudioStatus>(`/companies/${companyId}/agent-studio/status`),
  preview: (companyId: string, agentId: string, data: AgentStudioPreviewRequest) =>
    api.post<AgentStudioPreviewResponse>(`/companies/${companyId}/agent-studio/agents/${agentId}/preview`, data),
};
