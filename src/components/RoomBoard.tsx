import React from 'react';
import { Play, Users } from 'lucide-react';
import { GameState } from '../hooks/useRoomConnection';
import { Confetti } from './Confetti';
import { AwardOverlay } from './AwardOverlay';

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
  game?: GameState;
  actions?: {
    startGame: () => void;
    nextQuestion: () => void;
    finishGame: () => void;
    resetGame: () => void;
  }
}

export function RoomBoard({ roomId, players, isConnected, game, actions }: RoomBoardProps) {
  const handleStartGame = () => {
    if (!isConnected) return;
    actions?.startGame();
  };

  const resolveName = (userId?: string) => {
    if (!userId) return '';
    return players.find(p => p.userId === userId)?.name || 'Player';
  };

  return (
    <div className="room-board">
      <div className="board-content">
        {!game || game.status === 'idle' ? (
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
        ) : (
          <div className="section-card center">
            {game?.lastResult?.correct && <Confetti triggerKey={`${game.currentIndex}-${game.lastResult.userId}`} />}
            {(game && (game.status === 'running' || game.status === 'await-next')) && (
              <>
                <div className="subtitle" style={{ fontSize: 12, opacity: 0.8 }}>Question {game.currentIndex + 1} / {game.questions.length}</div>
                <div style={{ marginTop: 6, fontSize: 30, fontWeight: 800 }}>{game.questions[game.currentIndex]?.text}</div>
                {game.status === 'running' ? (
                  game.currentResponder ? (
                    <div style={{ marginTop: 8, fontWeight: 700 }}>Turn: {resolveName(game.currentResponder)}</div>
                  ) : (
                    <div style={{ marginTop: 8, color: '#555' }}>Buzz to answer!</div>
                  )
                ) : (
                  <div style={{ marginTop: 8, color: '#555' }}>Round complete</div>
                )}
                {game.lastResult && (
                  <>
                    {game.lastResult.answer && (
                      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800 }}>
                        “{game.lastResult.answer}”
                      </div>
                    )}
                    <div style={{ position: 'relative', height: 80, marginTop: 8 }}>
                      <AwardOverlay triggerKey={`${game.currentIndex}-${game.lastResult.userId}-${game.lastResult.delta}`} amount={game.lastResult.delta} />
                    </div>
                  </>
                )}
                {game.status === 'await-next' && (
                  <div style={{ marginTop: 10 }}>
                    <button className="btn" onClick={() => actions?.nextQuestion()}>Next question</button>
                  </div>
                )}
              </>
            )}
            {game?.status === 'finished' && (
              <Results scores={game.scores} players={players} onEnd={() => actions?.resetGame()} />
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
              [...players].sort((a, b) => (game?.scores?.[b.userId] ?? 0) - (game?.scores?.[a.userId] ?? 0)).map((player) => (
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

function Results({ scores, players, onEnd }: { scores: Record<string, number>; players: Player[]; onEnd: () => void }) {
  const ranking = Object.entries(scores)
    .map(([userId, score]) => ({ userId, score, name: players.find(p => p.userId === userId)?.name || 'Unknown' }))
    .sort((a, b) => b.score - a.score);

  const winner = ranking[0];
  return (
    <div className="section-card center" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Winner confetti */}
      <Confetti triggerKey={`winner-${winner?.userId || 'none'}`} durationMs={1800} />
      <div className="title" style={{ fontSize: 28, marginBottom: 8 }}>Winner</div>
      <div style={{ fontSize: 36, fontWeight: 900 }}>{winner?.name || '—'}</div>
      <div style={{ opacity: 0.9, marginTop: 4 }}>{winner ? `${winner.score} pts` : ''}</div>
      <div style={{ marginTop: 16 }}>
        {ranking.slice(1).map((r, idx) => (
          <div key={r.userId} className="row" style={{ justifyContent: 'space-between', maxWidth: 420, margin: '0 auto' }}>
            <span>{idx + 2}. {r.name}</span>
            <span>{r.score} pts</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn" onClick={onEnd}>End game</button>
      </div>
    </div>
  );
}