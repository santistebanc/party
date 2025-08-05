import React from 'react';
import { PlayerHeader } from './PlayerHeader';
import { CreateRoomForm } from './CreateRoomForm';

interface RoomInfo {
  id: string;
  createdAt: number;
}

interface LobbyProps {
  playerName: string;
  userId: string;
  rooms: RoomInfo[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onPlayerNameChange: (name: string) => void;
}

export function Lobby({
  playerName,
  userId,
  rooms,
  onJoinRoom,
  onCreateRoom,
  onPlayerNameChange
}: LobbyProps) {
  return (
    <div className="container">
      <PlayerHeader 
        playerName={playerName}
      />
      
      <div className="main-content">
        <div className="lobby-section">
          <CreateRoomForm onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} />
        </div>
      </div>
    </div>
  );
} 