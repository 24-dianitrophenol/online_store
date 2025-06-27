import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Message } from '../../types';

interface ChatInterfaceProps {
  onClose?: () => void;
  standalone?: boolean;
}

// Sample messages for demonstration
const DEMO_MESSAGES: Message[] = [
  {
    id: '1',
    senderId: 'support',
    receiverId: 'user',
    content: 'Hello! How can I help you today?',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: true,
  },
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  onClose, 
  standalone = false 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const message: Message = {
      id: Date.now().toString(),
      senderId: user?.id || 'user',
      receiverId: 'support',
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setMessages((prev) => [...prev, message]);
    setNewMessage('');
    
    // Simulate response after a delay
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        senderId: 'support',
        receiverId: user?.id || 'user',
        content: "Thanks for your message! Our support team will get back to you soon.",
        timestamp: new Date().toISOString(),
        read: false,
      };
      
      setMessages((prev) => [...prev, response]);
    }, 1000);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col ${standalone ? 'h-full' : 'h-[500px]'} bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden`}>
      {/* Chat header */}
      <div className="p-4 bg-primary text-white flex items-center justify-between">
        <div className="flex items-center">
          {onClose && (
            <button 
              onClick={onClose}
              className="mr-2 p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h3 className="font-semibold">Support Chat</h3>
            <p className="text-xs text-white/80">We typically reply within 10 minutes</p>
          </div>
        </div>
        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
        <div className="space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex ${message.senderId === (user?.id || 'user') ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-xs md:max-w-md rounded-lg p-3 ${
                  message.senderId === (user?.id || 'user')
                    ? 'bg-primary text-white rounded-br-none'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-bl-none shadow'
                }`}
              >
                <p>{message.content}</p>
                <div 
                  className={`text-xs mt-1 ${
                    message.senderId === (user?.id || 'user')
                      ? 'text-white/70'
                      : 'text-gray-500 dark:text-gray-300'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className={`ml-2 p-3 rounded-full ${
              newMessage.trim()
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            } transition-colors`}
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;