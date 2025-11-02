/**
 * Notification Model
 * Represents a notification in the system
 */

export type NotificationType =
  | 'deadline_reminder'
  | 'case_status_change'
  | 'evidence_uploaded'
  | 'document_updated'
  | 'system_alert'
  | 'system_warning'
  | 'system_info';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationMetadata {
  caseId?: number;
  evidenceId?: number;
  deadlineId?: number;
  documentId?: number;
  daysUntil?: number;
  oldStatus?: string;
  newStatus?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: NotificationMetadata;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
}

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: NotificationMetadata;
  expiresAt?: Date;
}

export interface UpdateNotificationInput {
  isRead?: boolean;
  isDismissed?: boolean;
  readAt?: string;
}

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  severity?: NotificationSeverity;
  limit?: number;
  offset?: number;
  includeExpired?: boolean;
  includeDismissed?: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<NotificationType, number>;
}