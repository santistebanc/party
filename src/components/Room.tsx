import React from 'react';
import { PlayersList } from './PlayersList';
import { Chat } from './Chat';
import { QRCodeDisplay } from './QRCodeDisplay';

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface ChatMessage {
  type: "chat" | "system";
  player?: Player;
  message: string;
  timestamp: number;
}

interface RoomProps {
  roomId: string;
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function Room({
  roomId,
  players,
  chatMessages,
  onSendMessage
}: RoomProps) {
  return (
    <div className="container">
      <header className="header">
        <h1>🎉 PartyKit Room</h1>
      </header>
      
      <div className="main-content">
        <div className="room-section">
          <div className="room-header">
            <h2>🎉 {roomId}</h2>
          </div>
          
          <div className="room-content">
            <div className="players-section">
              <PlayersList players={players} />
            </div>
            
            <div className="chat-section">
              <Chat 
                messages={chatMessages} 
                onSendMessage={onSendMessage} 
              />
            </div>
          </div>
          
          <QRCodeDisplay roomId={roomId} />
        </div>
      </div>
    </div>
  );
} 