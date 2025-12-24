
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import io from 'socket.io-client';

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>();

  useEffect(() => {
    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin;
    socketRef.current = io(socketUrl);

    socketRef.current.on('chat-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'professor',
      text: inputText,
      timestamp: new Date()
    };

    socketRef.current.emit('send-chat-message', newMessage);
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 rounded border border-slate-800">
      <div className="p-1 border-b border-slate-800 flex justify-between items-center">
        <span className="text-[9px] font-bold text-slate-500 uppercase px-1">Chat</span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-1.5 space-y-2"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === 'professor' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[90%] p-1.5 rounded text-[11px] leading-tight ${
              msg.sender === 'professor' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-slate-700 text-slate-100 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-1 border-t border-slate-800 bg-slate-900">
        <div className="flex gap-1">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="..."
            className="flex-1 bg-slate-800 text-[10px] text-white px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white p-1 rounded transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};
