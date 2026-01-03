import type { ApiClient } from "./client.ts";
import type { ApiResponse } from "./types.ts";

export function createDeadlinesApi(client: ApiClient) {
  return {
    list: async (params?: {
      caseId?: number;
      status?: string;
      priority?: string;
      limit?: number;
      offset?: number;
    }): Promise<
      ApiResponse<{
        items: Array<{
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
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
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

      return client.get<
        ApiResponse<{
          items: Array<{
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
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines", queryParams);
    },

    get: async (
      id: number
    ): Promise<
      ApiResponse<{
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
      }>
    > => {
      return client.get<
        ApiResponse<{
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
        }>
      >(`/deadlines/${id}`);
    },

    create: async (params: {
      caseId?: number;
      title: string;
      description?: string;
      deadlineDate?: string;
      dueDate?: string;
      priority?: string;
      reminderDaysBefore?: number;
    }): Promise<
      ApiResponse<{
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
      }>
    > => {
      return client.post<
        ApiResponse<{
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
        }>
      >("/deadlines", params);
    },

    update: async (
      id: number,
      params: {
        title?: string;
        description?: string;
        deadlineDate?: string;
        dueDate?: string;
        priority?: string;
        status?: string;
        reminderEnabled?: boolean;
        reminderDaysBefore?: number;
      }
    ): Promise<
      ApiResponse<{
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
      }>
    > => {
      return client.put<
        ApiResponse<{
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
        }>
      >(`/deadlines/${id}`, params);
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return client.delete<ApiResponse<void>>(`/deadlines/${id}`);
    },

    getUpcoming: async (
      days: number = 7,
      limit?: number
    ): Promise<
      ApiResponse<{
        items: Array<{
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
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      const queryParams: Record<string, number> = { days };
      if (limit !== undefined) {
        queryParams.limit = limit;
      }
      return client.get<
        ApiResponse<{
          items: Array<{
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
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/upcoming", queryParams);
    },

    getOverdue: async (): Promise<
      ApiResponse<{
        items: Array<{
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
          daysPast?: number;
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          items: Array<{
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
            daysPast?: number;
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/overdue");
    },

    getByDate: async (
      date: string
    ): Promise<
      ApiResponse<{
        items: Array<{
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
        }>;
        total: number;
        overdueCount: number;
      }>
    > => {
      return client.get<
        ApiResponse<{
          items: Array<{
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
          }>;
          total: number;
          overdueCount: number;
        }>
      >("/deadlines/by-date", { date });
    },

    markComplete: async (
      id: number
    ): Promise<
      ApiResponse<{
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
      }>
    > => {
      return client.post<
        ApiResponse<{
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
        }>
      >(`/deadlines/${id}/complete`, {});
    },

    snooze: async (
      id: number,
      hours: number
    ): Promise<
      ApiResponse<{
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
      }>
    > => {
      return client.post<
        ApiResponse<{
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
        }>
      >(`/deadlines/${id}/snooze`, { hours });
    },
  };
}
