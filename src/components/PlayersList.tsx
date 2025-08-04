import React from 'react';

interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

interface PlayersListProps {
  players: Player[];
}

export function PlayersList({ players }: PlayersListProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="players-list">
      {players.length === 0 ? (
        <div className="no-players">
          <p>No players in room yet.</p>
        </div>
      ) : (
        players.map((player) => (
          <div key={player.id} className="player-item">
            <div className="player-name">{player.name}</div>
            <div className="player-joined">
              Joined: {formatDate(player.joinedAt)}
            </div>
          </div>
        ))
      )}
    </div>
  );
} 