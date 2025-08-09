import React from 'react';
import { RoomPlay } from './RoomPlay';
import { RoomSettings } from './RoomSettings';
import { RoomChat } from './RoomChat';
import { PlayerHeader } from './PlayerHeader';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { getUserId } from '../utils/userUtils';
import { useQueryParams } from '../client';
import { QRCodeDisplay } from './QRCodeDisplay';
import { PlayersList } from './PlayersList';

interface RoomLayoutProps {
  playerName: string;
  userId: string;
  onPlayerNameChange: (name: string) => void;
  onBackToLobby: () => void;
}

export function RoomLayout({ playerName, userId, onPlayerNameChange, onBackToLobby }: RoomLayoutProps) {
  const { queryParams } = useQueryParams();
  const roomId = queryParams.roomId;
  const mode = ((queryParams.view || (roomId ? 'admin' : 'lobby')) as 'admin' | 'board' | 'player' | 'settings' | 'chat' | 'play');

  const autoJoin = mode === 'player' || mode === 'chat' || mode === 'settings' || mode === 'play';

  const { 
    players, 
    chatMessages, 
    isConnected, 
    sendChat, 
    leaveRoom 
  } = useRoomConnection(roomId || null, playerName, userId, { autoJoin });

  if (!roomId) {
    return <div>Room not found</div>;
  }

  const handleLeaveRoom = () => {
    leaveRoom();
    onBackToLobby();
  };

  const renderContent = () => {
    switch (mode) {
      case 'admin': {
        return (
          <div className="stack">
            <div className="row">
              <a className="btn chip-amber" href={`/?roomId=${roomId}&view=player`} target="_blank" rel="noreferrer">Open Player Link</a>
              <a className="btn chip-blue" href={`/?roomId=${roomId}&view=board`} target="_blank" rel="noreferrer">Open Board</a>
              <button className="btn btn-primary">Start the game</button>
            </div>
            <PlayersList players={players} />
          </div>
        );
      }
      case 'board':
        return (
          <div className="stack">
            <p className="subtitle">waiting for the game to start</p>
            <QRCodeDisplay roomId={roomId} />
            <PlayersList players={players} />
          </div>
        );
      case 'settings':
        return (
          <RoomSettings 
            roomId={roomId}
            onPlayerNameChange={onPlayerNameChange}
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
          <div className="stack">
            <p className="subtitle">waiting for the game to start</p>
            <PlayersList players={players} />
          </div>
        );
    }
  };

  return (
    <div className="page stack">
      <PlayerHeader playerName={playerName} roomId={roomId} />
      <div className="stack">
        {renderContent()}
      </div>
    </div>
  );
} 