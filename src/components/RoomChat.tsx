import React, { useState } from 'react';
import { Send, Users, MessageCircle } from 'lucide-react';
import { Chat } from './Chat';
import { PlayersList } from './PlayersList';

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

interface RoomChatProps {
  roomId: string;
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isConnected: boolean;
}

export function RoomChat({ 
  roomId, 
  players, 
  chatMessages, 
  onSendMessage, 
  isConnected 
}: RoomChatProps) {
  return (
    <div className="room-chat">
      <div className="chat-content">
        <div className="chat-section">
          <div className="chat-header">
            <MessageCircle size={16} /> Chat
          </div>
          <Chat 
            messages={chatMessages}
            onSendMessage={onSendMessage}
            isConnected={isConnected}
          />
        </div>
        
        <div className="players-section">
          <div className="players-header">
            <Users size={16} /> Players ({players.length})
          </div>
          <PlayersList players={players} />
        </div>
      </div>
    </div>
  );
} 