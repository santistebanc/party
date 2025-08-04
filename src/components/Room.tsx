import React from 'react';
import { PlayersList } from './PlayersList';
import { Chat } from './Chat';
import { QRCodeDisplay } from './QRCodeDisplay';

interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

interface ChatMessage {
  player: string;
  message: string;
  timestamp: number;
}

interface RoomProps {
  roomName: string;
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onLeaveRoom: () => void;
  roomId: string;
}

export function Room({
  roomName,
  players,
  chatMessages,
  onSendMessage,
  onLeaveRoom,
  roomId
}: RoomProps) {
  return (
    <div className="container">
      <header className="header">
        <h1>🎈 PartyKit Lobby</h1>
        <p>Create and join rooms to start partying!</p>
      </header>
      
      <div className="main-content">
        <div className="room-section">
          <div className="room-header">
            <h2>🎮 {roomName}</h2>
            <button onClick={onLeaveRoom} className="btn btn-danger">
              Leave Room
            </button>
          </div>
          
          <div className="room-content">
            <div className="players-section">
              <h4>👥 Players</h4>
              <PlayersList players={players} />
            </div>
            
            <div className="chat-section">
              <h4>💬 Chat</h4>
              <Chat messages={chatMessages} onSendMessage={onSendMessage} />
            </div>
          </div>
          
          <QRCodeDisplay roomId={roomId} />
        </div>
      </div>
    </div>
  );
} 