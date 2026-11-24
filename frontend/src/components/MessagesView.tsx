import React, { useState, useEffect, useRef } from 'react';
import { messageApi } from '../services/messageApi';
import type { ConversationItem, ChatMessage } from '../services/messageApi';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Loader2, MapPin, Sparkles } from 'lucide-react';

interface MessagesViewProps {
  onExploreStays?: () => void;
  initialConversationId?: number | null;
}

export const MessagesView: React.FC<MessagesViewProps> = ({
  onExploreStays,
  initialConversationId,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvoId, setSelectedConvoId] = useState<number | null>(initialConversationId || null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [activeOtherUser, setActiveOtherUser] = useState<any>(null);
  const [activeProperty, setActiveProperty] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConvoId) {
      loadMessages(selectedConvoId);
    }
  }, [selectedConvoId]);

  // Polling for active conversation
  useEffect(() => {
    if (!selectedConvoId) return;

    const interval = setInterval(() => {
      refreshActiveMessages(selectedConvoId);
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const loadConversations = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const list = await messageApi.getConversations();
      setConversations(list);
      if (!selectedConvoId && list.length > 0) {
        setSelectedConvoId(list[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load conversations.');
    } finally {
      setLoadingList(false);
    }
  };

  const loadMessages = async (cId: number) => {
    setLoadingMessages(true);
    try {
      const res = await messageApi.getConversationMessages(cId);
      setActiveMessages(res.messages || []);
      setActiveOtherUser(res.other_user);
      setActiveProperty(res.conversation?.property);
      // update unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === cId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to load message thread.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const refreshActiveMessages = async (cId: number) => {
    try {
      const res = await messageApi.getConversationMessages(cId);
      setActiveMessages(res.messages || []);
    } catch {
      // silently ignore polling errors
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvoId) return;

    const content = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      const newMsg = await messageApi.sendMessage(selectedConvoId, content);
      setActiveMessages((prev) => [...prev, newMsg]);
      // Update latest message in conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConvoId
            ? { ...c, latest_message: newMsg, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to send reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="portal-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div className="portal-header" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <MessageSquare size={28} className="text-rose-600" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Messages & Inquiries</h1>
        </div>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          Direct communication with your hosts and guests regarding stays, check-in, and amenities.
        </p>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {loadingList ? (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <Loader2 className="spinner" size={32} />
          <p style={{ marginTop: '0.75rem', color: '#888' }}>Loading your conversations…</p>
        </div>
      ) : conversations.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#fafafa',
            borderRadius: '16px',
            border: '1px dashed #ddd',
          }}
        >
          <Sparkles size={40} color="#FF385C" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No messages yet
          </h3>
          <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            When you contact hosts or receive booking inquiries, your message threads will appear here.
          </p>
          {onExploreStays && (
            <button className="btn-primary" onClick={onExploreStays}>
              Explore Stays
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row h-[650px]">
          {/* Left Column: Conversations List */}
          <div className="w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col shrink-0 bg-slate-50/50">
            <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-500">
              All Conversations ({conversations.length})
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {conversations.map((convo) => {
                const isSelected = convo.id === selectedConvoId;
                const other = convo.other_user;
                const prop = convo.property;
                return (
                  <button
                    key={convo.id}
                    onClick={() => setSelectedConvoId(convo.id)}
                    className={`w-full text-left p-3.5 px-4 transition-all flex items-start gap-3 hover:bg-slate-100/60 ${
                      isSelected ? 'bg-white shadow-sm border-l-4 border-rose-600' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                      {other?.name ? other.name.charAt(0) : 'U'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {other?.name || 'User'}
                        </span>
                        {convo.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-bold">
                            {convo.unread_count}
                          </span>
                        )}
                      </div>

                      {prop && (
                        <p className="text-[11px] text-slate-600 truncate font-medium">
                          {prop.title}
                        </p>
                      )}

                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {convo.latest_message?.message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Thread */}
          <div className="flex-1 flex flex-col bg-white">
            {selectedConvoId && (
              <>
                {/* Active Chat Header */}
                <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {activeOtherUser?.name || 'Chat'}
                    </h3>
                    {activeProperty && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-rose-500" />
                        {activeProperty.title} ({activeProperty.city}, {activeProperty.country})
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-50/20">
                  {loadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <Loader2 className="animate-spin" size={24} />
                      <span className="text-xs">Loading messages…</span>
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                      <MessageSquare size={36} className="text-slate-300 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">No messages yet</p>
                      <p className="text-[11px] text-slate-400">Send a message below to start chatting.</p>
                    </div>
                  ) : (
                    activeMessages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                              isMine
                                ? 'bg-rose-600 text-white rounded-br-none'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                            }`}
                          >
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <form
                  onSubmit={handleSendReply}
                  className="p-4 border-t border-slate-100 flex items-center gap-2 bg-white"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write your message…"
                    className="flex-1 text-xs p-3 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white text-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all shrink-0"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
