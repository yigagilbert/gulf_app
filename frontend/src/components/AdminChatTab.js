import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Clock, MessageCircle, MoreVertical, Search, Send, User } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { usePortal } from '../context/PortalContext';
import APIService from '../services/APIService';
import EmptyState from './EmptyState';

const AdminChatTab = () => {
  const { user } = useAuth();
  const { setUnreadMessages } = usePortal();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const convs = await APIService.getChatConversations();
      setConversations(convs || []);
      setUnreadMessages((convs || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0));
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  }, [setUnreadMessages]);

  const loadChatHistory = useCallback(async (conversation = selectedConversation) => {
    if (!conversation) return;
    try {
      const history = await APIService.getChatHistory(conversation.user_id);
      setMessages(history || []);
      await APIService.markConversationRead(conversation.user_id);
      await loadInbox();
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }, [loadInbox, selectedConversation]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (selectedConversation) {
      loadChatHistory(selectedConversation);
    }
  }, [selectedConversation, loadChatHistory]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedConversation) return;

    const messageText = input.trim();
    setInput('');

    try {
      await APIService.sendChatMessage(selectedConversation.user_id, messageText);
      await loadChatHistory(selectedConversation);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(messageText);
    }
  };

  const filteredConversations = conversations.filter((conversation) => (
    (conversation.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.latest_message.content.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.sent_at);
    groups[date] = groups[date] || [];
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex h-full bg-white rounded-lg shadow">
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Client Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={MessageCircle}
                title="No messages received yet"
                description="When clients send questions about their applications, their conversations will appear here."
                tone="soft"
              />
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.user_id}
                onClick={() => setSelectedConversation(conversation)}
                className={`cursor-pointer border-b border-gray-100 p-4 transition-colors hover:bg-gray-50 ${
                  selectedConversation?.user_id === conversation.user_id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {conversation.profile_photo_url ? (
                      <img
                        src={APIService.getAssetUrl(conversation.profile_photo_url)}
                        alt={conversation.display_name}
                        className="w-10 h-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">{conversation.display_name}</p>
                      <div className="flex items-center space-x-2">
                        {conversation.unread_count > 0 ? (
                          <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unread_count}
                          </span>
                        ) : null}
                        <span className="text-xs text-gray-500">{formatTime(conversation.latest_message.sent_at)}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">{conversation.latest_message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-1 text-gray-500 hover:text-gray-700"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{selectedConversation.display_name}</h3>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>
                </div>
                <button className="p-1 text-gray-500 hover:text-gray-700">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                <div key={date}>
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">{date}</span>
                  </div>

                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          message.sender_id === user.id
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <div
                          className={`flex items-center mt-1 text-xs ${
                            message.sender_id === user.id ? 'text-blue-100 justify-end' : 'text-gray-500'
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(message.sent_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your response..."
                  rows="1"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <EmptyState
              icon={MessageCircle}
              title="Select a conversation"
              description="Choose a client conversation from the left to review messages and reply."
              tone="soft"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatTab;
