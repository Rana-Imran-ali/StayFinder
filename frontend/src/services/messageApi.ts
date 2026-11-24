import { api } from './api';

export interface MessageSender {
  id: number;
  name: string;
  email?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  sender?: MessageSender;
}

export interface ConversationItem {
  id: number;
  property?: {
    id: number;
    title: string;
    city: string;
    country: string;
    primaryImage?: {
      image_path: string;
    } | null;
  } | null;
  booking_id: number | null;
  is_host: boolean;
  other_user: {
    id: number;
    name: string;
    email: string;
  };
  latest_message?: ChatMessage | null;
  unread_count: number;
  last_message_at: string;
}

export const messageApi = {
  /**
   * Fetch all conversations for the authenticated user.
   */
  getConversations: async (): Promise<ConversationItem[]> => {
    const res: any = await api.get('/conversations');
    return res?.data ?? [];
  },

  /**
   * Start or fetch existing conversation with host for a property.
   */
  startConversation: async (propertyId: number, initialMessage?: string, bookingId?: number) => {
    const res: any = await api.post('/conversations/start', {
      property_id: propertyId,
      booking_id: bookingId,
      message: initialMessage,
    });
    return res?.data;
  },

  /**
   * Get full message thread for a conversation.
   */
  getConversationMessages: async (conversationId: number) => {
    const res: any = await api.get(`/conversations/${conversationId}`);
    return res?.data as {
      conversation: any;
      other_user: { id: number; name: string; email: string };
      is_host: boolean;
      messages: ChatMessage[];
    };
  },

  /**
   * Send a message in a conversation.
   */
  sendMessage: async (conversationId: number, message: string): Promise<ChatMessage> => {
    const res: any = await api.post(`/conversations/${conversationId}/messages`, { message });
    return res?.data;
  },

  /**
   * Get total unread messages count.
   */
  getUnreadCount: async (): Promise<number> => {
    try {
      const res: any = await api.get('/messages/unread-count');
      return res?.count ?? 0;
    } catch {
      return 0;
    }
  },
};
