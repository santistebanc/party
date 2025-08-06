import React from 'react';
import { RoomPlay } from './RoomPlay';
import { RoomBoard } from './RoomBoard';
import { RoomSettings } from './RoomSettings';
import { RoomChat } from './RoomChat';
import { PlayerHeader } from './PlayerHeader';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { getUserId } from '../utils/userUtils';
import { useQueryParams } from '../client';

interface RoomLayoutProps {
  playerName: string;
  userId: string;
  onPlayerNameChange: (name: string) => void;
  onBackToLobby: () => void;
}

export function RoomLayout({ playerName, userId, onPlayerNameChange, onBackToLobby }: RoomLayoutProps) {
  const { queryParams } = useQueryParams();
  const roomId = queryParams.roomId;

  const { 
    players, 
    chatMessages, 
    isConnected, 
    sendChat, 
    leaveRoom 
  } = useRoomConnection(roomId || null, playerName, userId);

  if (!roomId) {
    return <div>Room not found</div>;
  }

  const handleLeaveRoom = () => {
    leaveRoom();
    onBackToLobby();
  };

  const renderContent = () => {
    switch (queryParams.view) {
      case 'board':
        return (
          <RoomBoard 
            roomId={roomId}
            players={players}
            isConnected={isConnected}
          />
        );
      case 'settings':
        return (
          <RoomSettings 
            roomId={roomId}
            onPlayerNameChange={onPlayerNameChange}
            onLeaveRoom={handleLeaveRoom}
          />
        );
      case 'chat':
        return (
          <RoomChat 
            roomId={roomId}
            players={players}
            chatMessages={chatMessages}
            onSendMessage={sendChat}
            isConnected={isConnected}
          />
        );
      case 'play':
      default:
        return (
          <RoomPlay 
            roomId={roomId}
            players={players}
            isConnected={isConnected}
          />
        );
    }
  };

  return (
    <div className="container">
      <PlayerHeader 
        playerName={playerName}
        roomId={roomId}
      />
      
      <div className="main-content">
        <div className="room-section">
          <div className="room-content">
            <div className="room-page-content">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 