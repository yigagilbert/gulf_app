import React, { useState, useEffect, useRef } from 'react';
import APIService from '../services/APIService';
import { MessageCircle } from 'lucide-react';

const ADMIN_ID = 'admin-id-or-fetch-from-api'; // Replace with actual admin id logic

const ClientChatWidget = ({ user }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      APIService.getChatHistory(ADMIN_ID).then(setMessages);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await APIService.sendChatMessage(ADMIN_ID, input);
    setInput('');
    const updated = await APIService.getChatHistory(ADMIN_ID);
    setMessages(updated);
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-4 shadow-lg z-50"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      {open && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 flex flex-col">
          <div className="p-4 border-b flex justify-between items-center">
            <span className="font-bold text-blue-600">Chat with Admin</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: '300px' }}>
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-lg ${msg.sender_id === user.id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-4 border-t flex">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Type your message..."
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button
              onClick={sendMessage}
              className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientChatWidget;