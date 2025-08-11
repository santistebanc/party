import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { useEffect, useRef, useState } from 'react';

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
        return <AdminUnified roomId={roomId} />;
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
    <>
      <PlayerHeader playerName={playerName} roomId={roomId} />
      <div className="page stack">
        <div className="stack">
          {renderContent()}
        </div>
      </div>
    </>
  );
} 

// --- Unified Admin Page ---
function AdminUnified({ roomId }: { roomId: string }) {
  const { game, actions, adminState } = useRoomConnection(roomId, '', '', { autoJoin: false });
  const [activeTab, setActiveTab] = useState<'game' | 'bank'>('game');
  const [upcoming, setUpcoming] = useState(adminState?.upcoming || []);
  const [bank, setBank] = useState(adminState?.bank || []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [editing, setEditing] = useState<{ list: 'upcoming' | 'bank'; index: number } | null>(null);
  const editingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (!editing) return;
      if (editingRef.current && !editingRef.current.contains(e.target as Node)) {
        setEditing(null);
        editingRef.current = null;
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [editing]);

  useEffect(() => { if (adminState) setUpcoming(adminState.upcoming || []); }, [adminState?.upcoming]);
  useEffect(() => { if (adminState) setBank(adminState.bank || []); }, [adminState?.bank]);

  const handleGenerate = async () => {
    try {
      const res = await fetch('/questions.sample.json');
      const all = await res.json();
      const normalized = all.map((q: any) => ({ id: crypto.randomUUID(), text: q.text, answer: q.answer, points: Number(q.points) || 10 }));
      setBank(normalized);
      actions.setBank(normalized);
    } catch (e) { console.error('Failed to load questions.sample.json', e); }
  };

  const updateUpcoming = (index: number, field: 'text'|'answer'|'points', value: string) => {
    const next = upcoming.map((q, i) => i === index ? { ...q, [field]: field === 'points' ? Number(value) : value } : q);
    setUpcoming(next); actions.setUpcoming(next);
  };
  const updateBank = (index: number, field: 'text'|'answer'|'points', value: string) => {
    const next = bank.map((q, i) => i === index ? { ...q, [field]: field === 'points' ? Number(value) : value } : q);
    setBank(next); actions.setBank(next);
  };

  const moveItem = (list: 'upcoming'|'bank', from: number, to: number) => {
    if (from === to) return;
    if (list === 'upcoming') {
      const next = arrayMove(upcoming, from, to);
      setUpcoming(next); actions.setUpcoming(next);
    } else {
      const next = arrayMove(bank, from, to);
      setBank(next); actions.setBank(next);
    }
  };

  const removeItem = (list: 'upcoming'|'bank', index: number) => {
    const src = list === 'upcoming' ? [...upcoming] : [...bank];
    src.splice(index, 1);
    if (list === 'upcoming') { setUpcoming(src); actions.setUpcoming(src); } else { setBank(src); actions.setBank(src); }
  };

  const addFromBankToUpcoming = (index: number) => {
    const item = bank[index]; if (!item) return;
    const next = [...upcoming, { ...item, id: crypto.randomUUID() }];
    setUpcoming(next); actions.setUpcoming(next);
  };

  const repeatToUpcoming = (q: any) => {
    actions.repeatQuestion(q);
  };

  const startGame = () => actions.startGame();
  const resetGame = () => actions.resetGame();
  const nextQuestion = () => actions.nextQuestion();

  const renderList = (list: 'upcoming'|'bank') => {
    const items = list === 'upcoming' ? upcoming : bank;
    const onUpdate = list === 'upcoming' ? updateUpcoming : updateBank;
    const onRemove = (idx: number) => removeItem(list, idx);
    const extraButton = list === 'bank';
    const onDragEnd = (event: any) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) moveItem(list, oldIndex, newIndex);
    };

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="stack" style={{ marginTop: 8 }}>
            {items.map((q, idx) => (
              <SortableRow
                key={q.id}
                id={q.id}
                isEditing={!!editing && editing.list === list && editing.index === idx}
                setEditing={(val: boolean) => setEditing(val ? { list, index: idx } : null)}
                editingRef={editingRef}
                onDoubleClick={() => setEditing({ list, index: idx })}
              >
                <div className="cell cell-question">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" placeholder="Question" value={q.text} onChange={(e) => onUpdate(idx, 'text', e.target.value)} />
                  ) : (
                    <div className="cell-text">{q.text || <span className="muted">(empty)</span>}</div>
                  )}
                </div>
                <div className="cell cell-answer">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" placeholder="Answer" value={q.answer} onChange={(e) => onUpdate(idx, 'answer', e.target.value)} />
                  ) : (
                    <div className="cell-text">{q.answer || <span className="muted">(no answer)</span>}</div>
                  )}
                </div>
                <div className="cell cell-points">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" type="number" min={1} max={100} value={q.points} onChange={(e) => onUpdate(idx, 'points', e.target.value)} />
                  ) : (
                    <div className="cell-text">{q.points} pts</div>
                  )}
                </div>
                <div className="cell cell-actions">
                  {extraButton && <button className="btn" onClick={() => addFromBankToUpcoming(idx)}>Add</button>}
                  {editing && editing.list === list && editing.index === idx ? (
                    <button className="btn" onClick={() => setEditing(null)}>Done</button>
                  ) : (
                    <button className="btn" onClick={() => setEditing({ list, index: idx })}>Edit</button>
                  )}
                  <button className="btn" onClick={() => onRemove(idx)}>Remove</button>
                </div>
              </SortableRow>
            ))}
            {items.length === 0 && <div className="subtitle">No items</div>}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  const renderHistory = () => {
    const history = adminState?.history || [];
    return (
      <div className="stack" style={{ marginTop: 8 }}>
        {history.map((h: any) => (
          <div key={h.index} className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{h.index + 1}. {h.question?.text}</div>
              {h.result && (
                <div className={h.result.correct ? 'result-correct' : 'result-wrong'}>
                  {h.result.correct ? 'gained' : 'lost'} {h.result.correct ? '+' : ''}{h.result.delta}
                  {h.result.answer ? <> – "{h.result.answer}"</> : null}
                </div>
              )}
            </div>
            <button className="btn" onClick={() => repeatToUpcoming(h.question)}>Repeat</button>
          </div>
        ))}

      </div>
    );
  };

  return (
    <div className="stack">
      {/* Navigation Links */}
      <div className="row" style={{ gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        <a href={`/?roomId=${roomId}&view=board`} className="btn" target="_blank">Open Board</a>
        <a href={`/?roomId=${roomId}&view=player`} className="btn" target="_blank">Open Player Link</a>
      </div>

      <div className="row" style={{ gap: 6, justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="row" style={{ gap: 6 }}>
          <button className={`btn ${activeTab === 'game' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('game')}>Game</button>
          <button className={`btn ${activeTab === 'bank' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('bank')}>Questions bank</button>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {activeTab === 'bank' && <button className="btn" onClick={handleGenerate}>Generate</button>}
          {activeTab === 'game' && (
            <>
              <button className="btn" onClick={startGame}>Start</button>
              <button className="btn" onClick={nextQuestion}>Next</button>
              <button className="btn" onClick={resetGame}>Reset</button>
            </>
          )}
        </div>
      </div>

      <div className="section-card">
        {activeTab === 'game' && (
          <>
            {renderHistory()}
            {renderList('upcoming')}
          </>
        )}
        {activeTab === 'bank' && renderList('bank')}
      </div>
    </div>
  );
}

function SortableRow({ id, children, isEditing, setEditing, editingRef, onDoubleClick }: { id: string; children: React.ReactNode; isEditing: boolean; setEditing: (v: boolean) => void; editingRef: React.MutableRefObject<HTMLDivElement | null>; onDoubleClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: isEditing });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={(node) => { setNodeRef(node); if (isEditing) editingRef.current = node as HTMLDivElement; }} style={style} className="admin-list-row dnd-draggable" onDoubleClick={onDoubleClick} {...attributes} {...listeners}>
      {children}
    </div>
  );
}