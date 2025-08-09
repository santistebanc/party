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
  scores?: Record<string, number>;
}

export function PlayersList({ players, scores }: PlayersListProps) {
  const getScore = (p: Player) => (scores ? scores[p.userId] ?? 0 : 0);
  const ordered = [...players].sort((a, b) => getScore(b) - getScore(a));

  if (ordered.length === 0) {
    return (
      <div className="players-list">
        <p className="no-players">No players in room</p>
      </div>
    );
  }

  return (
    <div className="players-list">
      {ordered.map((player) => (
        <div key={player.id} className="player-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="player-avatar">
              <User size={12} />
            </div>
            <span className="player-name">{player.name}</span>
          </div>
          <span aria-label="score">{getScore(player)} pts</span>
        </div>
      ))}
    </div>
  );
} 