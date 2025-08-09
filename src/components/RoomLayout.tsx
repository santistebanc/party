import React from 'react';
import { RoomPlay } from './RoomPlay';
import { RoomSettings } from './RoomSettings';
import { RoomChat } from './RoomChat';
import { PlayerHeader } from './PlayerHeader';
import { useRoomConnection } from '../hooks/useRoomConnection';
import { RoomBoard } from './RoomBoard';
import { getUserId } from '../utils/userUtils';
import { useQueryParams } from '../client';
import { QRCodeDisplay } from './QRCodeDisplay';
import { PlayersList } from './PlayersList';
import { useState } from 'react';

interface RoomLayoutProps {
  playerName: string;
  userId: string;
  onPlayerNameChange: (name: string) => void;
  onBackToLobby: () => void;
}

export function RoomLayout({ playerName, userId, onPlayerNameChange, onBackToLobby }: RoomLayoutProps) {
  const { queryParams } = useQueryParams();
  const roomId = queryParams.roomId;
  const mode = ((queryParams.view || (roomId ? 'admin' : 'lobby')) as 'admin' | 'board' | 'player' | 'settings' | 'chat' | 'play');

  const autoJoin = mode === 'player' || mode === 'chat' || mode === 'settings' || mode === 'play';

  const { 
    players, 
    chatMessages, 
    isConnected, 
    game,
    sendChat, 
    leaveRoom,
    actions,
  } = useRoomConnection(roomId || null, playerName, userId, { autoJoin });

  if (!roomId) {
    return <div>Room not found</div>;
  }

  const handleLeaveRoom = () => {
    leaveRoom();
    onBackToLobby();
  };

  const renderContent = () => {
    switch (mode) {
      case 'admin': {
        return <AdminPanel roomId={roomId} game={game} actions={actions} />;
      }
      case 'board':
        return (
          <div className="stack">
            <RoomBoard roomId={roomId} players={players} isConnected={isConnected} game={game} actions={actions} />
          </div>
        );
      case 'settings':
        return (
          <RoomSettings 
            roomId={roomId}
            onPlayerNameChange={onPlayerNameChange}
          />
        );
      case 'chat':
        return (
          <RoomChat 
            roomId={roomId}
            players={players}
            chatMessages={chatMessages}
            onSendMessage={sendChat}
            isConnected={isConnected}
          />
        );
      case 'play':
      default:
        return (
          <div className="stack">
            <RoomPlay roomId={roomId} players={players} isConnected={isConnected} game={game} actions={actions} currentUserId={userId} />
          </div>
        );
    }
  };

  return (
    <div className="page stack">
      <PlayerHeader playerName={playerName} roomId={roomId} />
      <div className="stack">
        {renderContent()}
      </div>
    </div>
  );
} 

// --- Admin Panel ---
function AdminPanel({ roomId }: { roomId: string }) {
  const { game, actions } = useRoomConnection(roomId, '', '', { autoJoin: false });
  const [localQuestions, setLocalQuestions] = useState(game?.questions || []);
  const [generateCount, setGenerateCount] = useState(5);

  const addQuestion = () => {
    setLocalQuestions(prev => [...prev, { id: crypto.randomUUID(), text: '', answer: '', points: 10 }]);
  };
  const updateQuestion = (idx: number, field: 'text'|'answer'|'points', value: string) => {
    setLocalQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: field === 'points' ? Number(value) : value } : q));
  };
  const removeQuestion = (idx: number) => {
    setLocalQuestions(prev => prev.filter((_, i) => i !== idx));
  };
  const saveQuestions = () => {
    actions.setQuestions(localQuestions);
  };
  const generateQuestions = async () => {
    try {
      const res = await fetch('/questions.sample.json');
      const all = await res.json();
      const take = Math.max(1, Math.min(generateCount, all.length));
      const picked = all.slice(0, take).map((q: any) => ({ id: crypto.randomUUID(), text: q.text, answer: q.answer, points: Number(q.points) || 10 }));
      setLocalQuestions(picked);
    } catch (e) {
      console.error('Failed to load questions.sample.json', e);
    }
  };

  const startGame = () => actions.startGame();
  const resetGame = () => actions.resetGame();

  return (
    <div className="stack">
      <div className="row">
        <a className="btn" href={`/?roomId=${roomId}&view=player`} target="_blank" rel="noreferrer">Open Player Link</a>
        <a className="btn" href={`/?roomId=${roomId}&view=board`} target="_blank" rel="noreferrer">Open Board</a>
        <button className="btn btn-primary" onClick={startGame}>Start game</button>
        <button className="btn" onClick={resetGame}>Reset</button>
      </div>
      <div className="section-card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <button className="btn" onClick={addQuestion}>Add question</button>
          <div className="row">
            <input className="room-input" type="number" min={1} max={50} value={generateCount} onChange={(e) => setGenerateCount(Number(e.target.value))} />
            <button className="btn" onClick={generateQuestions}>Generate</button>
          </div>
          <button className="btn btn-primary" onClick={saveQuestions}>Save</button>
        </div>
        <div className="stack" style={{ marginTop: 8 }}>
          {localQuestions.map((q, idx) => (
            <div key={q.id} className="row" style={{ alignItems: 'stretch' }}>
              <input className="room-input" placeholder="Question" value={q.text} onChange={(e) => updateQuestion(idx, 'text', e.target.value)} style={{ flex: 2 }} />
              <input className="room-input" placeholder="Answer" value={q.answer} onChange={(e) => updateQuestion(idx, 'answer', e.target.value)} style={{ flex: 1 }} />
              <input className="room-input" type="number" min={1} max={100} value={q.points} onChange={(e) => updateQuestion(idx, 'points', e.target.value)} style={{ width: 90 }} />
              <button className="btn" onClick={() => removeQuestion(idx)}>Remove</button>
            </div>
          ))}
          {localQuestions.length === 0 && <div className="subtitle">No questions yet</div>}
        </div>
      </div>
    </div>
  );
}