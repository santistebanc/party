import React, { useState } from 'react';
import { CreateRoomForm } from './CreateRoomForm';
import { RoomsList } from './RoomsList';
import { PlayerInfo } from './PlayerInfo';
import { AdminTools } from './AdminTools';

interface RoomInfo {
  id: string;
  name: string;
  createdAt: number;
}

interface LobbyProps {
  playerName: string;
  userId: string;
  rooms: RoomInfo[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: (name: string) => void;
  onClearStorage: () => void;
  onGenerateRandomName: () => void;
  onPlayerNameChange: (name: string) => void;
}

export function Lobby({
  playerName,
  userId,
  rooms,
  onJoinRoom,
  onCreateRoom,
  onClearStorage,
  onGenerateRandomName,
  onPlayerNameChange
}: LobbyProps) {
  return (
    <div className="container">
      <header className="header">
        <h1>🎈 PartyKit Lobby</h1>
        <p>Create and join rooms to start partying!</p>
      </header>
      
      <div className="main-content">
        <div className="lobby-section">
          <PlayerInfo
            playerName={playerName}
            userId={userId}
            onPlayerNameChange={onPlayerNameChange}
            onGenerateRandomName={onGenerateRandomName}
          />
          
          <CreateRoomForm onCreateRoom={onCreateRoom} />
          <RoomsList rooms={rooms} onJoinRoom={onJoinRoom} />
          
          <AdminTools onClearStorage={onClearStorage} />
        </div>
      </div>
    </div>
  );
} 