import React from 'react';
import { Clock, Users } from 'lucide-react';
import { GameState } from '../hooks/useRoomConnection';
import { AwardOverlay } from './AwardOverlay';
import { Confetti } from './Confetti';

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
  game?: GameState;
  actions?: {
    buzz: () => void;
    submitAnswer: (text: string) => void;
  };
  currentUserId?: string;
}

export function RoomPlay({ roomId, players, isConnected, game, actions, currentUserId }: RoomPlayProps) {
  return (
    <div className="room-play">
      <div className="play-content">
        {(!game || game.status === 'idle') && (
          <div className="waiting-message">
            <h3><Clock size={24} /> Waiting for Game to Start</h3>
            <p>The game will begin when the host starts it from the Board page.</p>
          </div>
        )}
        {game && game.status === 'running' && (
          <div className="section-card">
            <div style={{ fontWeight: 700 }}>Q{game.currentIndex + 1}: {game.questions[game.currentIndex]?.text}</div>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => actions?.buzz()}
                disabled={
                  !isConnected ||
                  game.status !== 'running' ||
                  !!(currentUserId && game.buzzQueue?.includes(currentUserId))
                }
              >
                Buzz
              </button>
            </div>
            {currentUserId && game.currentResponder === currentUserId && (
              <div className="row" style={{ marginTop: 8 }}>
                <input className="chat-input" placeholder="Your answer" id="player-answer-input" />
                <button className="btn" onClick={() => {
                  const el = document.getElementById('player-answer-input') as HTMLInputElement | null;
                  const text = el?.value || '';
                  actions?.submitAnswer(text);
                  if (el) el.value = '';
                }}>Submit</button>
              </div>
            )}
            {game.lastResult && (
              <div style={{ position: 'relative', height: 80, marginTop: 8 }}>
                <AwardOverlay triggerKey={`${game.currentIndex}-${game.lastResult.userId}-${game.lastResult.delta}`} amount={game.lastResult.delta} />
              </div>
            )}
            {currentUserId && game.lastResult?.correct && game.lastResult.userId === currentUserId && (
              <Confetti triggerKey={`${game.currentIndex}-${game.lastResult.userId}`} />
            )}
          </div>
        )}
        
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