import React from 'react';
import { Gamepad2, Target, Settings, MessageCircle } from 'lucide-react';
import { useQueryParams } from '../client';

interface PlayerHeaderProps {
  playerName: string;
  roomId?: string;
}

export function PlayerHeader({ playerName, roomId }: PlayerHeaderProps) {
  const { queryParams, updateQueryParams } = useQueryParams();

  const isInRoom = !!roomId && queryParams.roomId === roomId;
  const view = queryParams.view || 'play';
  const hideHeader = view === 'admin' || view === 'board';

  const handleNavigation = (view: string) => {
    updateQueryParams({ roomId, view });
  };

  if (hideHeader) return null;

  return (
    <div className="player-header">
      <div className="player-name-section">
        <span className="player-name">{playerName}</span>
      </div>
      
      {isInRoom && (
        <div className="header-navigation">
          <button 
            onClick={() => handleNavigation('play')} 
            className={`btn btn-icon ${view === 'play' ? 'active' : ''}`}
            title="Play"
          >
            <Gamepad2 size={18} />
          </button>
          <button 
            onClick={() => handleNavigation('settings')} 
            className={`btn btn-icon ${view === 'settings' ? 'active' : ''}`}
            title="Settings"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={() => handleNavigation('chat')} 
            className={`btn btn-icon ${view === 'chat' ? 'active' : ''}`}
            title="Chat"
          >
            <MessageCircle size={18} />
          </button>
        </div>
      )}
    </div>
  );
} 