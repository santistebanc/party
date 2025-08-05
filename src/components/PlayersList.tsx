import React from 'react';
import { User } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface PlayersListProps {
  players: Player[];
}

export function PlayersList({ players }: PlayersListProps) {
  if (players.length === 0) {
    return (
      <div className="players-list">
        <p className="no-players">No players in room</p>
      </div>
    );
  }

  return (
    <div className="players-list">
      {players.map((player) => (
        <div key={player.id} className="player-item">
          <div className="player-avatar">
            <User size={12} />
          </div>
          <span className="player-name">{player.name}</span>
        </div>
      ))}
    </div>
  );
} 