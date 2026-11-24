import { api } from './api';

export interface AppNotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const notificationApi = {
  /**
   * Get recent notifications and unread count.
   */
  getNotifications: async (): Promise<{ data: AppNotificationItem[]; unread_count: number }> => {
    const res: any = await api.get('/notifications');
    return {
      data: res?.data ?? [],
      unread_count: res?.unread_count ?? 0,
    };
  },

  /**
   * Mark a single notification as read.
   */
  markAsRead: async (id: number) => {
    return api.post(`/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read.
   */
  markAllAsRead: async () => {
    return api.post('/notifications/read-all');
  },

  /**
   * Get unread count.
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res: any = await api.get('/notifications/unread-count');
      return res?.count ?? 0;
    } catch {
      return 0;
    }
  },
};
