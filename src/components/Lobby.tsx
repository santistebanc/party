import React from 'react';
import { PlayerInfo } from './PlayerInfo';
import { CreateRoomForm } from './CreateRoomForm';

interface RoomInfo {
  id: string;
  createdAt: number;
}

interface LobbyProps {
  playerName: string;
  userId: string;
  rooms: RoomInfo[];
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onPlayerNameChange: (name: string) => void;
}

export function Lobby({
  playerName,
  userId,
  rooms,
  onCreateRoom,
  onJoinRoom,
  onPlayerNameChange
}: LobbyProps) {
  return (
    <div className="container">
      <header className="header">
        <h1>🎉 PartyKit Lobby</h1>
      </header>
      
      <div className="main-content">
        <div className="lobby-section">
          <PlayerInfo
            playerName={playerName}
            userId={userId}
            onPlayerNameChange={onPlayerNameChange}
          />
          
          <CreateRoomForm onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} />
        </div>
      </div>
    </div>
  );
} 