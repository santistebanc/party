import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  type: 'chat' | 'system';
  message: string;
  player?: Player;
  timestamp: number;
}

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

export function Chat({ messages, onSendMessage, isConnected }: ChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && isConnected) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-section">
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.type}`}>
            {msg.type === 'chat' && msg.player ? (
              <>
                <span className="player-name">{msg.player.name}</span>
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
                <span className="message-text">{msg.message}</span>
              </>
            ) : (
              <>
                <span className="player-name">System</span>
                <span className="timestamp">{formatTime(msg.timestamp)}</span>
                <span className="message-text">{msg.message}</span>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-section">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="chat-input"
            disabled={!isConnected}
          />
          <button 
            type="submit" 
            className="chat-send-btn"
            disabled={!newMessage.trim() || !isConnected}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
} 