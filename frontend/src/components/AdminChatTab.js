import React, { useState, useEffect, useRef } from 'react';
import APIService from '../services/APIService';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Clock, 
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../AuthProvider';

const AdminChatTab = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [userProfiles, setUserProfiles] = useState({}); // userId -> {name, photo}
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedConversation) {
      loadChatHistory();
    }
  }, [selectedConversation]);

  // Helper to fetch user profile by ID
  const fetchUserProfile = async (userId) => {
    try {
      // You should have an endpoint like /admin/clients/{userId} or /users/{userId}
      const profile = await APIService.getUserProfile(userId);
      return {
        name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Unknown',
        photo: profile.profile_photo_url || null,
      };
    } catch {
      return { name: 'Unknown', photo: null };
    }
  };

  // Fetch all user profiles for conversations
  const fetchAllUserProfiles = async (convs) => {
    const ids = Array.from(new Set(convs.map(c => c.userId)));
    const profiles = {};
    await Promise.all(ids.map(async (id) => {
      profiles[id] = await fetchUserProfile(id);
    }));
    setUserProfiles(profiles);
  };

  const loadInbox = async () => {
    setLoading(true);
    try {
      const inbox = await APIService.getAdminInbox();
      
      // Group messages by sender to create conversations
      const conversationsMap = {};
      inbox.forEach(message => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        if (!conversationsMap[otherUserId]) {
          conversationsMap[otherUserId] = {
            userId: otherUserId,
            lastMessage: message,
            unreadCount: 0,
          };
        }
        
        // Update with the most recent message
        if (new Date(message.sent_at) > new Date(conversationsMap[otherUserId].lastMessage.sent_at)) {
          conversationsMap[otherUserId].lastMessage = message;
        }
        
        // Count unread messages (from other users to admin)
        if (message.receiver_id === user.id && !message.is_read) {
          conversationsMap[otherUserId].unreadCount++;
        }
      });
      const convs = Object.values(conversationsMap);
      setConversations(convs);
      await fetchAllUserProfiles(convs);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChatHistory = async () => {
    if (!selectedConversation) return;
    
    try {
      const history = await APIService.getChatHistory(selectedConversation.userId);
      setMessages(history || []);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedConversation) return;
    
    const messageText = input.trim();
    setInput('');
    
    try {
      await APIService.sendChatMessage(selectedConversation.userId, messageText);
      await loadChatHistory();
      await loadInbox(); // Refresh inbox to update last message
    } catch (error) {
      console.error('Failed to send message:', error);
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

  const filteredConversations = conversations.filter(conv => {
    const profile = userProfiles[conv.userId] || {};
    return (
      (profile.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.sent_at);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex h-full bg-white rounded-lg shadow">
      {/* Conversations Sidebar */}
      <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Client Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const profile = userProfiles[conv.userId] || {};
              return (
                <div
                  key={conv.userId}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.userId === conv.userId ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {profile.photo ? (
                        <img
                          src={profile.photo}
                          alt={profile.name}
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
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {profile.name || 'Unknown'}
                        </p>
                        <div className="flex items-center space-x-2">
                          {conv.unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                              {conv.unreadCount}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTime(conv.lastMessage.sent_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conv.lastMessage.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
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
                    <h3 className="font-medium text-gray-900">{selectedConversation.userEmail}</h3>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>
                </div>
                <button className="p-1 text-gray-500 hover:text-gray-700">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {Object.entries(groupedMessages).map(([date, dayMessages]) => (
                <div key={date}>
                  <div className="flex justify-center my-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      {date}
                    </span>
                  </div>
                  
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
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type your response..."
                  rows="1"
                  style={{ minHeight: '38px', maxHeight: '100px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p>Choose a client conversation from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChatTab;