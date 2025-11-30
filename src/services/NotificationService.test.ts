import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotificationService } from "./NotificationService";
import { NotificationRepository } from "../repositories/NotificationRepository";
import { NotificationPreferencesRepository } from "../repositories/NotificationPreferencesRepository";
import { AuditLogger } from "./AuditLogger";
import type {
  CreateNotificationInput,
  NotificationFilters,
} from "../models/Notification";
import type { NotificationPreferences } from "../models/NotificationPreferences";

// Mock repositories and services
vi.mock("../repositories/NotificationRepository.ts");
vi.mock("../repositories/NotificationPreferencesRepository.ts");
vi.mock("./AuditLogger.ts");

describe("NotificationService", () => {
  let service: NotificationService;
  let notificationRepo: NotificationRepository;
  let preferencesRepo: NotificationPreferencesRepository;
  let auditLogger: AuditLogger;
  let logSpy: ReturnType<typeof vi.spyOn>;

  const mockNotification = {
    id: 1,
    userId: 1,
    type: "deadline_reminder" as const,
    severity: "medium" as const,
    title: "Test Notification",
    message: "This is a test notification",
    actionUrl: "/test",
    actionLabel: "View",
    metadata: { testKey: "testValue" },
    isRead: false,
    isDismissed: false,
    createdAt: new Date().toISOString(),
    readAt: undefined,
    expiresAt: undefined,
  };

  const mockPreferences: NotificationPreferences = {
    id: 1,
    userId: 1,
    deadlineRemindersEnabled: true,
    deadlineReminderDays: 7,
    caseUpdatesEnabled: true,
    evidenceUpdatesEnabled: true,
    systemAlertsEnabled: true,
    soundEnabled: true,
    desktopNotificationsEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    notificationRepo = new NotificationRepository({} as any);
    preferencesRepo = new NotificationPreferencesRepository({} as any);
    auditLogger = new AuditLogger({} as any);
    logSpy = vi.spyOn(auditLogger, "log").mockImplementation(() => {});
    service = new NotificationService(
      notificationRepo,
      preferencesRepo,
      auditLogger,
    );
  });

  describe("createNotification", () => {
    it("should create a notification when type is enabled", async () => {
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValue(mockPreferences);
      vi.spyOn(notificationRepo, "create").mockReturnValue(mockNotification);

      const input: CreateNotificationInput = {
        userId: 1,
        type: "deadline_reminder",
        severity: "medium",
        title: "Test Notification",
        message: "This is a test notification",
      };

      const result = await service.createNotification(input);

      expect(result).toEqual(mockNotification);
      expect(notificationRepo.create).toHaveBeenCalledWith(input);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.create",
          userId: "1",
          resourceType: "notification",
          resourceId: "1",
          action: "create",
          details: expect.objectContaining({
            type: "deadline_reminder",
            severity: "medium",
          }),
        }),
      );
    });

    it("should throw error when notification type is disabled", async () => {
      const disabledPrefs = {
        ...mockPreferences,
        deadlineRemindersEnabled: false,
      };
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValue(disabledPrefs);

      const input: CreateNotificationInput = {
        userId: 1,
        type: "deadline_reminder",
        severity: "medium",
        title: "Test Notification",
        message: "This is a test notification",
      };

      await expect(service.createNotification(input)).rejects.toThrow(
        "Notification type deadline_reminder is disabled",
      );
    });

    it("should throw error during quiet hours", async () => {
      const quietHoursPrefs = {
        ...mockPreferences,
        quietHoursEnabled: true,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
      };
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValue(quietHoursPrefs);

      const input: CreateNotificationInput = {
        userId: 1,
        type: "system_info",
        severity: "low",
        title: "Test",
        message: "Test",
      };

      await expect(service.createNotification(input)).rejects.toThrow(
        "Notification blocked during quiet hours",
      );
    });
  });

  describe("getNotifications", () => {
    it("should retrieve notifications with filters", async () => {
      const notifications = [mockNotification];
      vi.spyOn(notificationRepo, "findByUser").mockReturnValue(notifications);

      const filters: NotificationFilters = {
        unreadOnly: true,
        type: "deadline_reminder",
        limit: 10,
      };

      const result = await service.getNotifications(1, filters);

      expect(result).toEqual(notifications);
      expect(notificationRepo.findByUser).toHaveBeenCalledWith(1, filters);
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read and log", async () => {
      vi.spyOn(notificationRepo, "markAsRead").mockReturnValue(true);
      await service.markAsRead(1);

      expect(notificationRepo.markAsRead).toHaveBeenCalledWith(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.read",
          resourceId: "1",
          action: "read",
        }),
      );
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications as read", async () => {
      vi.spyOn(notificationRepo, "markAllAsRead").mockReturnValue(5);
      const result = await service.markAllAsRead(1);

      expect(result).toBe(5);
      expect(notificationRepo.markAllAsRead).toHaveBeenCalledWith(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.read_all",
          userId: "1",
          resourceId: "1",
          action: "update",
          details: { count: 5 },
        }),
      );
    });
  });

  describe("dismiss", () => {
    it("should dismiss notification and log", async () => {
      vi.spyOn(notificationRepo, "dismiss").mockReturnValue(true);
      await service.dismiss(1);

      expect(notificationRepo.dismiss).toHaveBeenCalledWith(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.dismiss",
          resourceId: "1",
          action: "update",
        }),
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread notification count", async () => {
      vi.spyOn(notificationRepo, "getUnreadCount").mockReturnValue(3);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(3);
      expect(notificationRepo.getUnreadCount).toHaveBeenCalledWith(1);
    });
  });

  describe("getPreferences", () => {
    it("should return existing preferences", async () => {
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValue(mockPreferences);

      const result = await service.getPreferences(1);

      expect(result).toEqual(mockPreferences);
    });

    it("should create default preferences if none exist", async () => {
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValueOnce(null);
      vi.spyOn(preferencesRepo, "createDefaults").mockReturnValue(
        mockPreferences,
      );

      const result = await service.getPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(preferencesRepo.createDefaults).toHaveBeenCalledWith(1);
    });
  });

  describe("updatePreferences", () => {
    it("should update preferences and log", async () => {
      const updates = { soundEnabled: false, deadlineReminderDays: 3 };
      const updated = { ...mockPreferences, ...updates };
      vi.spyOn(preferencesRepo, "update").mockReturnValue(updated);
      const result = await service.updatePreferences(1, updates);

      expect(result).toEqual(updated);
      expect(preferencesRepo.update).toHaveBeenCalledWith(1, updates);
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.preferences_update",
          resourceType: "notification_preferences",
          resourceId: "1",
          action: "update",
          details: { changes: ["soundEnabled", "deadlineReminderDays"] },
        }),
      );
    });
  });

  describe("cleanupExpired", () => {
    it("should cleanup expired notifications and log", async () => {
      vi.spyOn(notificationRepo, "deleteExpired").mockReturnValue(10);

      const result = await service.cleanupExpired();

      expect(result).toBe(10);
      expect(notificationRepo.deleteExpired).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: "notification.cleanup",
          resourceType: "notification",
          action: "delete",
          details: { deletedCount: 10 },
        }),
      );
    });

    it("should not log if no notifications were cleaned", async () => {
      vi.spyOn(notificationRepo, "deleteExpired").mockReturnValue(0);

      const result = await service.cleanupExpired();

      expect(result).toBe(0);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe("createSystemNotification", () => {
    it("should create system notification with appropriate type", async () => {
      vi.spyOn(preferencesRepo, "findByUser").mockReturnValue(mockPreferences);
      vi.spyOn(notificationRepo, "create").mockReturnValue({
        ...mockNotification,
        type: "system_warning",
      });

      const result = await service.createSystemNotification(
        1,
        "medium",
        "System Warning",
        "This is a system warning",
      );

      expect(result.type).toBe("system_warning");
      expect(notificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "system_warning",
          severity: "medium",
        }),
      );
      expect(logSpy).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: "notification.create" }),
      );
    });
  });
});
