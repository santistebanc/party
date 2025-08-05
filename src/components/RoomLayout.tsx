import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { RoomPlay } from './RoomPlay';
import { RoomBoard } from './RoomBoard';
import { RoomSettings } from './RoomSettings';
import { RoomChat } from './RoomChat';
import { PlayerHeader } from './PlayerHeader';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { getUserId } from '../utils/userUtils';

interface RoomLayoutProps {
  playerName: string;
  userId: string;
  onPlayerNameChange: (name: string) => void;
}

export function RoomLayout({ playerName, userId, onPlayerNameChange }: RoomLayoutProps) {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

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
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <RoomPlay 
                      roomId={roomId}
                      players={players}
                      isConnected={isConnected}
                    />
                  } 
                />
                <Route 
                  path="/board" 
                  element={
                    <RoomBoard 
                      roomId={roomId}
                      players={players}
                      isConnected={isConnected}
                    />
                  } 
                />
                <Route 
                  path="/settings" 
                  element={
                    <RoomSettings 
                      roomId={roomId}
                      onPlayerNameChange={onPlayerNameChange}
                      onLeaveRoom={() => {
                        leaveRoom();
                        navigate('/');
                      }}
                    />
                  } 
                />
                <Route 
                  path="/chat" 
                  element={
                    <RoomChat 
                      roomId={roomId}
                      players={players}
                      chatMessages={chatMessages}
                      onSendMessage={sendChat}
                      isConnected={isConnected}
                    />
                  } 
                />
              </Routes>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 