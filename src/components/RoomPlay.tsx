import React from 'react';
import { Clock, Users } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface RoomPlayProps {
  roomId: string;
  players: Player[];
  isConnected: boolean;
}

export function RoomPlay({ roomId, players, isConnected }: RoomPlayProps) {
  return (
    <div className="room-play">
      <div className="play-content">
        <div className="waiting-message">
          <h3><Clock size={24} /> Waiting for Game to Start</h3>
          <p>The game will begin when the host starts it from the Board page.</p>
        </div>
        
        <div className="players-section">
          <div className="players-header">
            <Users size={16} /> Players ({players.length})
          </div>
          <div className="players-list">
            {players.length === 0 ? (
              <p className="no-players">No players in room</p>
            ) : (
              players.map((player) => (
                <div key={player.id} className="player-item">
                  <div className="player-avatar">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="player-name">{player.name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 