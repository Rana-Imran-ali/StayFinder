import React, { useState, useEffect, useRef } from 'react';
import { messageApi } from '../services/messageApi';
import type { ChatMessage } from '../services/messageApi';
import { useAuth } from '../context/AuthContext';
import { getSafePropertyImageUrl } from '../utils/dummyImages';
import { X, Send, Loader2, MessageSquare, MapPin } from 'lucide-react';

interface ChatModalProps {
  propertyId?: number;
  bookingId?: number;
  conversationId?: number;
  isOpen: boolean;
  onClose: () => void;
  onOpenFullInbox?: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  propertyId,
  bookingId,
  conversationId: initialConvoId,
  isOpen,
  onClose,
  onOpenFullInbox,
}) => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<number | null>(initialConvoId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<{ id: number; name: string } | null>(null);
  const [property, setProperty] = useState<any>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      initConversation();
    } else {
      setMessages([]);
      setOtherUser(null);
      setProperty(null);
      setText('');
      setError(null);
    }
  }, [isOpen, propertyId, initialConvoId]);

  // Polling for new messages while chat is open
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const interval = setInterval(() => {
      fetchMessages(conversationId, false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initConversation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (initialConvoId) {
        setConversationId(initialConvoId);
        await fetchMessages(initialConvoId, true);
      } else if (propertyId) {
        const convo = await messageApi.startConversation(propertyId, undefined, bookingId);
        setConversationId(convo.id);
        setProperty(convo.property);
        const other = convo.host_id === user?.id ? convo.guest : convo.host;
        setOtherUser(other);
        setMessages(convo.messages || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to open conversation.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (cId: number, isInitial: boolean = false) => {
    try {
      const res = await messageApi.getConversationMessages(cId);
      setMessages(res.messages || []);
      setOtherUser(res.other_user);
      setProperty(res.conversation?.property);
    } catch (err: any) {
      if (isInitial) setError(err?.message || 'Failed to load messages.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const messageContent = text.trim();
    setText('');
    setSending(true);

    try {
      if (!conversationId && propertyId) {
        const convo = await messageApi.startConversation(propertyId, messageContent, bookingId);
        setConversationId(convo.id);
        await fetchMessages(convo.id, true);
        return;
      }

      if (conversationId) {
        const newMsg = await messageApi.sendMessage(conversationId, messageContent);
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const rawCover = property?.primary_image?.image_path || property?.primaryImage?.image_path || null;
  const propImg = property ? getSafePropertyImageUrl(rawCover, property.id, property.property_type || 'apartment') : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
              {otherUser?.name ? otherUser.name.charAt(0) : <MessageSquare size={18} />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {otherUser ? otherUser.name : 'Host Inquiry'}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Direct Chat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onOpenFullInbox && (
              <button
                type="button"
                onClick={onOpenFullInbox}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors mr-1"
              >
                Full Inbox
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Property Mini Banner */}
        {property && (
          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            {propImg && (
              <img
                src={propImg}
                alt={property.title}
                className="w-10 h-10 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="min-w-0">
              <h4 className="text-xs font-bold text-slate-900 truncate">{property.title}</h4>
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <MapPin size={10} /> {property.city}, {property.country}
              </p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="animate-spin" size={24} />
              <span className="text-xs">Loading conversation…</span>
            </div>
          ) : error ? (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center px-4">
              <MessageSquare size={36} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Start the conversation</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ask about check-in, parking, amenities, or any special requests.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
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

        {/* Text Input */}
        <form onSubmit={handleSend} className="p-3 px-4 border-t border-slate-100 bg-white flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 text-xs p-2.5 px-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 focus:bg-white transition-all text-slate-800"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all shrink-0"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
};
