import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Target, Settings, MessageCircle } from 'lucide-react';

interface PlayerHeaderProps {
  playerName: string;
  roomId?: string;
}

export function PlayerHeader({ playerName, roomId }: PlayerHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isInRoom = roomId && location.pathname.startsWith(`/room/${roomId}`);

  return (
    <div className="player-header">
      <div className="player-name-section">
        <span className="player-name">{playerName}</span>
      </div>
      
      {isInRoom && (
        <div className="header-navigation">
          <button 
            onClick={() => navigate(`/room/${roomId}`)} 
            className={`btn btn-icon ${location.pathname === `/room/${roomId}` ? 'active' : ''}`}
            title="Play"
          >
            <Gamepad2 size={18} />
          </button>
          <button 
            onClick={() => navigate(`/room/${roomId}/board`)} 
            className={`btn btn-icon ${location.pathname === `/room/${roomId}/board` ? 'active' : ''}`}
            title="Board"
          >
            <Target size={18} />
          </button>
          <button 
            onClick={() => navigate(`/room/${roomId}/settings`)} 
            className={`btn btn-icon ${location.pathname === `/room/${roomId}/settings` ? 'active' : ''}`}
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={() => navigate(`/room/${roomId}/chat`)} 
            className={`btn btn-icon ${location.pathname === `/room/${roomId}/chat` ? 'active' : ''}`}
            title="Chat"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      )}
    </div>
  );
} 