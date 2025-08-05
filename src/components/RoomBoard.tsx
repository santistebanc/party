import React from 'react';
import { Play, Users } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface RoomBoardProps {
  roomId: string;
  players: Player[];
  isConnected: boolean;
}

export function RoomBoard({ roomId, players, isConnected }: RoomBoardProps) {
  const handleStartGame = () => {
    console.log('Starting game...');
    // TODO: Implement game start logic
  };

  return (
    <div className="room-board">
      <div className="board-content">
        <div className="start-game-section">
          <h3><Play size={24} /> Ready to Start?</h3>
          <p>All players are ready. Click the button below to start the game!</p>
          <button 
            onClick={handleStartGame} 
            className="start-game-btn"
            disabled={!isConnected}
          >
            <Play size={20} /> Start Game
          </button>
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