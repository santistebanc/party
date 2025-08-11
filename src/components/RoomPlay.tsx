import React, { useState } from 'react';
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
  const [lastAnswerByQuestion, setLastAnswerByQuestion] = useState<Record<number, string>>({});
  return (
    <div className="room-play">
      <div className="play-content">
        {(!game || game.status === 'idle') && (
          <div className="waiting-message">
            <h3><Clock size={24} /> Waiting for Game to Start</h3>
            <p>The game will begin when the host starts it from the Board page.</p>
          </div>
        )}
        {game && (game.status === 'running' || game.status === 'await-next') && (
          <div className="section-card">
            <div className="subtitle" style={{ fontSize: 12, opacity: 0.8 }}>Question {game.currentIndex + 1} / {game.questions.length}</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{game.questions[game.currentIndex]?.text}</div>
            {game.status === 'running' && (
              <div className="buzzer-container">
                <button
                  className="buzzer-btn"
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
            )}
            {currentUserId && game.status === 'running' && game.currentResponder === currentUserId && (
              <div className="row" style={{ marginTop: 8 }}>
                <input className="chat-input" placeholder="Your answer" id="player-answer-input" />
                <button className="btn" onClick={() => {
                  const el = document.getElementById('player-answer-input') as HTMLInputElement | null;
                  const text = el?.value || '';
                  // keep local copy to show after submit
                  setLastAnswerByQuestion((m) => ({ ...m, [game.currentIndex]: text }));
                  actions?.submitAnswer(text);
                  if (el) el.value = '';
                }}>Submit</button>
              </div>
            )}
            {game.status === 'await-next' && (
              <div className="subtitle" style={{ marginTop: 6, opacity: 0.8 }}>Round complete</div>
            )}
            {/* Show the submitted answer text to all players */}
            {game.lastResult?.answer && (
              <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800 }}>
                “{game.lastResult.answer}”
              </div>
            )}
            {/* Show submitted answer result for the current player */}
            {currentUserId && game.lastResult && game.lastResult.userId === currentUserId && (
              <div style={{ marginTop: 10 }}>
                <div style={{ marginTop: 6, fontWeight: 700 }}>
                  {game.lastResult.correct ? (
                    <span style={{ color: '#0a7f27' }}>Correct +{game.lastResult.delta}</span>
                  ) : (
                    <span style={{ color: '#a40000' }}>Incorrect {game.lastResult.delta}</span>
                  )}
                </div>
              </div>
            )}
            {game.lastResult && (
              <div style={{ position: 'relative', height: 80, marginTop: 8 }}>
                <AwardOverlay triggerKey={`${game.currentIndex}-${game.lastResult.userId}-${game.lastResult.delta}`} amount={game.lastResult.delta} />
              </div>
            )}
            {game.lastResult && (
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {(players.find(p => p.userId === game.lastResult?.userId)?.name) || 'Player'}{' '}
                {game.lastResult.correct ? (
                  <span style={{ color: '#0a7f27' }}>+{game.lastResult.delta}</span>
                ) : (
                  <span style={{ color: '#a40000' }}>{game.lastResult.delta}</span>
                )}
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
              [...players]
                .sort((a, b) => (game?.scores?.[b.userId] ?? 0) - (game?.scores?.[a.userId] ?? 0))
                .map((player) => (
                  <div key={player.id} className="player-item" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="player-avatar">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="player-name">{player.name}</span>
                    </div>
                    <span aria-label="score">{game?.scores?.[player.userId] ?? 0} pts</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 