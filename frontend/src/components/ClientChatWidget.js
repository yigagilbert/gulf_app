import React, { useState, useEffect, useRef } from 'react';
import APIService from '../services/APIService';
import { MessageCircle, Send, X, Users, Clock } from 'lucide-react';
import { useAuth } from '../AuthProvider';

const ClientChatWidget = () => {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Load chat history when admin is selected
  useEffect(() => {
    if (open && selectedAdmin) {
      loadChatHistory();
    }
  }, [open, selectedAdmin]);

  // Set default admin for clients
  useEffect(() => {
    if (!isAdmin && open && !selectedAdmin) {
      // For clients, find the first admin user (this could be improved to select the best admin)
      setSelectedAdmin('868730db-3023-477c-91c0-289a9bf1e63e'); // Default admin ID
    }
  }, [isAdmin, open, selectedAdmin]);

  const loadChatHistory = async () => {
    if (!selectedAdmin) return;
    
    setLoading(true);
    try {
      const history = await APIService.getChatHistory(selectedAdmin);
      setMessages(history || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedAdmin) return;
    
    const messageText = input.trim();
    setInput('');
    
    try {
      await APIService.sendChatMessage(selectedAdmin, messageText);
      // Reload chat history to show the new message
      await loadChatHistory();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore the input if sending failed
      setInput(messageText);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.sent_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!user) return null;

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg z-50 transition-all duration-300 transform hover:scale-110 ${
          open 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-600 hover:bg-blue-700'
        } text-white`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {/* Message indicator - could be enhanced to show unread count */}
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-3 w-3"></span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 flex flex-col max-h-[70vh]">
          {/* Chat Header */}
          <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span className="font-semibold">
                {isAdmin ? 'Client Support' : 'Chat with Admin'}
              </span>
            </div>
            <button 
              onClick={() => setOpen(false)}
              className="text-blue-100 hover:text-white transition-colors"
              aria-label="Close chat"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No messages yet.</p>
                <p className="text-sm">Start a conversation!</p>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, dayMessages]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  
                  {/* Messages for this date */}
                  {dayMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender_id === user.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-lg ${
                          msg.sender_id === user.id
                            ? 'bg-blue-600 text-white rounded-br-sm'
                            : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                        }`}
                      >
                        <p className="break-words">{msg.content}</p>
                        <div
                          className={`flex items-center mt-1 text-xs ${
                            msg.sender_id === user.id
                              ? 'text-blue-100 justify-end'
                              : 'text-gray-500'
                          }`}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(msg.sent_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-gray-50 rounded-b-xl">
            <div className="flex space-x-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Type your message..."
                rows="1"
                style={{ minHeight: '38px', maxHeight: '100px' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 640px) {
          .chat-widget {
            width: calc(100vw - 1rem);
            right: 0.5rem;
            left: 0.5rem;
          }
        }
      `}</style>
    </>
  );
};

export default ClientChatWidget;