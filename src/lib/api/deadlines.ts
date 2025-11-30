/**
 * Deadlines API module.
 *
 * @module api/deadlines
 */

import { BaseApiClient } from "./client";
import { ApiResponse } from "./types";

// ====================
// Deadlines Types
// ====================

export interface Deadline {
  id: number;
  caseId?: number;
  userId: number;
  title: string;
  description?: string;
  deadlineDate: string;
  priority: string;
  status: string;
  completed: boolean;
  completedAt?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  createdAt: string;
  updatedAt: string;
  caseTitle?: string;
  caseStatus?: string;
  daysUntil?: number;
  daysPast?: number;
}

export interface DeadlineListResponse {
  items: Deadline[];
  total: number;
  overdueCount: number;
}

export interface CreateDeadlineInput {
  caseId?: number;
  title: string;
  description?: string;
  deadlineDate?: string;
  dueDate?: string;
  priority?: string;
  reminderDaysBefore?: number;
}

export interface UpdateDeadlineInput {
  title?: string;
  description?: string;
  deadlineDate?: string;
  dueDate?: string;
  priority?: string;
  status?: string;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number;
}

// ====================
// Deadlines API Factory
// ====================

export function createDeadlinesApi(client: BaseApiClient) {
  return {
    list: async (params?: {
      caseId?: number;
      status?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }): Promise<ApiResponse<DeadlineListResponse>> => {
      const queryParams: Record<string, string | number> = {};
      if (params?.caseId !== undefined) {
        queryParams.case_id = params.caseId;
      }
      if (params?.status) {
        queryParams.status = params.status;
      }
      if (params?.priority) {
        queryParams.priority = params.priority;
      }
      if (params?.limit !== undefined) {
        queryParams.limit = params.limit;
      }
      if (params?.offset !== undefined) {
        queryParams.offset = params.offset;
      }

      return client.get<ApiResponse<DeadlineListResponse>>(
        "/deadlines",
        queryParams,
      );
    },

    get: async (id: number): Promise<ApiResponse<Deadline>> => {
      return client.get<ApiResponse<Deadline>>(`/deadlines/${id}`);
    },

    create: async (
      params: CreateDeadlineInput,
    ): Promise<ApiResponse<Deadline>> => {
      return client.post<ApiResponse<Deadline>>("/deadlines", params);
    },

    update: async (
      id: number,
      params: UpdateDeadlineInput,
    ): Promise<ApiResponse<Deadline>> => {
      return client.put<ApiResponse<Deadline>>(`/deadlines/${id}`, params);
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/deadlines/${id}`);
    },

    getUpcoming: async (
      days: number = 7,
      limit?: number,
    ): Promise<ApiResponse<DeadlineListResponse>> => {
      const queryParams: Record<string, number> = { days };
      if (limit !== undefined) {
        queryParams.limit = limit;
      }
      return client.get<ApiResponse<DeadlineListResponse>>(
        "/deadlines/upcoming",
        queryParams,
      );
    },

    getOverdue: async (): Promise<ApiResponse<DeadlineListResponse>> => {
      return client.get<ApiResponse<DeadlineListResponse>>(
        "/deadlines/overdue",
      );
    },

    getByDate: async (
      date: string,
    ): Promise<ApiResponse<DeadlineListResponse>> => {
      return client.get<ApiResponse<DeadlineListResponse>>(
        "/deadlines/by-date",
        { date },
      );
    },

    markComplete: async (id: number): Promise<ApiResponse<Deadline>> => {
      return client.post<ApiResponse<Deadline>>(
        `/deadlines/${id}/complete`,
        {},
      );
    },

    snooze: async (
      id: number,
      hours: number,
    ): Promise<ApiResponse<Deadline>> => {
      return client.post<ApiResponse<Deadline>>(`/deadlines/${id}/snooze`, {
        hours,
      });
    },
  };
}

export type DeadlinesApi = ReturnType<typeof createDeadlinesApi>;
