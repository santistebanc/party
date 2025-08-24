import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, Settings, X, Plus } from 'lucide-react';
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
  const { players, game, actions, adminState } = useRoomConnection(roomId, '', '', { autoJoin: false });
  const [upcoming, setUpcoming] = useState(adminState?.upcoming || []);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const [editing, setEditing] = useState<{ list: 'upcoming' | 'bank'; index: number } | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerationSettings, setShowGenerationSettings] = useState(false);
  const [questionCount, setQuestionCount] = useState(5);
  const [topicFilterType, setTopicFilterType] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [topicFilters, setTopicFilters] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');
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

  useEffect(() => { 
    if (adminState) {
      setUpcoming(adminState.upcoming || []);
      // Reset generating state when admin state updates (indicating AI generation completed)
      if (isGenerating) {
        setIsGenerating(false);
      }
    }
  }, [adminState?.upcoming, isGenerating]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Send message to server to generate AI questions with settings
      actions.generateQuestions({
        questionCount,
        topicFilterType,
        topicFilters
      });
    } catch (e) { 
      console.error('Failed to request AI questions:', e);
      setIsGenerating(false);
    }
  };

  const addTopic = () => {
    if (newTopic.trim() && !topicFilters.includes(newTopic.trim())) {
      setTopicFilters([...topicFilters, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    setTopicFilters(topicFilters.filter(t => t !== topic));
  };

  const toggleFilterType = () => {
    setTopicFilterType(prev => prev === 'whitelist' ? 'blacklist' : 'whitelist');
  };

  const updateUpcoming = (index: number, field: 'text'|'answer'|'points'|'topics', value: string) => {
    const next = upcoming.map((q, i) => {
      if (i === index) {
        if (field === 'points') {
          return { ...q, [field]: Number(value) };
        } else if (field === 'topics') {
          return { ...q, [field]: value.split(',').map(t => t.trim()).filter(t => t.length > 0) };
        } else {
          return { ...q, [field]: value };
        }
      }
      return q;
    });
    setUpcoming(next); actions.setUpcoming(next);
  };

  const toggleExpandedQuestion = (itemId: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleExpandedAnswer = (itemId: string) => {
    setExpandedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const setEditingWithExpansion = (list: 'upcoming' | 'bank', index: number) => {
    const item = upcoming[index];
    if (item) {
      setExpandedQuestions(prev => new Set([...prev, item.id]));
      setExpandedAnswers(prev => new Set([...prev, item.id]));
    }
    setEditing({ list, index });
  };

  const moveItem = (list: 'upcoming'|'bank', from: number, to: number) => {
    if (from === to) return;
    if (list === 'upcoming') {
      const next = arrayMove(upcoming, from, to);
      setUpcoming(next); actions.setUpcoming(next);
    }
  };

  const removeItem = (list: 'upcoming'|'bank', index: number) => {
    const src = list === 'upcoming' ? [...upcoming] : [];
    src.splice(index, 1);
    if (list === 'upcoming') { setUpcoming(src); actions.setUpcoming(src); }
  };

  const repeatToUpcoming = (q: any) => {
    actions.repeatQuestion(q);
    // Auto-expand the repeated question and answer
    if (q.id) {
      setExpandedQuestions(prev => new Set([...prev, q.id]));
      setExpandedAnswers(prev => new Set([...prev, q.id]));
    }
  };

  const shufflePlaylist = () => {
    const shuffled = [...upcoming].sort(() => Math.random() - 0.5);
    setUpcoming(shuffled);
    actions.setUpcoming(shuffled);
  };

  const handleAddBlankQuestion = () => {
    const newQuestion = {
      id: `blank-${Date.now()}`,
      text: '',
      answer: '',
      points: 10,
      topics: []
    };
    
    // Add to upcoming questions
    actions.addQuestion(newQuestion);
    
    // Set edit mode for the new question
    setEditing({ list: 'upcoming', index: upcoming.length });
    
    // Auto-reveal the question and answer text
    setExpandedQuestions(prev => new Set([...prev, newQuestion.id]));
    setExpandedAnswers(prev => new Set([...prev, newQuestion.id]));
  };

  const startGame = () => actions.startGame();
  const resetGame = () => actions.resetGame();
  const nextQuestion = () => actions.nextQuestion();

  const renderList = (list: 'upcoming'|'bank') => {
    const items = list === 'upcoming' ? upcoming : [];
    const onUpdate = updateUpcoming;
    const onRemove = (idx: number) => removeItem('upcoming', idx);
    const onDragEnd = (event: any) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) moveItem('upcoming', oldIndex, newIndex);
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
                onDoubleClick={() => setEditingWithExpansion(list, idx)}
              >
                <div className="cell cell-question">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" placeholder="Question" value={q.text} onChange={(e) => onUpdate(idx, 'text', e.target.value)} />
                  ) : (
                    <div className="cell-text">
                      <span className={expandedQuestions.has(q.id) ? "" : "blurred-text"}>
                        {q.text || <span className="muted">(empty)</span>}
                      </span>
                      {!expandedQuestions.has(q.id) && (
                        <button 
                          className="btn-icon eye-toggle-btn" 
                          onClick={(e) => { e.stopPropagation(); toggleExpandedQuestion(q.id); }}
                          title="Show question"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="cell cell-answer">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" placeholder="Answer" value={q.answer} onChange={(e) => onUpdate(idx, 'answer', e.target.value)} />
                  ) : (
                    <div className="cell-text">
                      {expandedAnswers.has(q.id) ? (
                        q.answer || <span className="muted">(no answer)</span>
                      ) : (
                        <span className="muted">••••••••••</span>
                      )}
                      {!expandedAnswers.has(q.id) && expandedQuestions.has(q.id) && (
                        <button 
                          className="btn-icon eye-toggle-btn" 
                          onClick={(e) => { e.stopPropagation(); toggleExpandedAnswer(q.id); }}
                          title="Show answer"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="cell cell-points">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" type="number" min={1} max={100} value={q.points} onChange={(e) => onUpdate(idx, 'points', e.target.value)} />
                  ) : (
                    <div className="cell-text">{q.points} pts</div>
                  )}
                </div>
                <div className="cell cell-topics">
                  {editing && editing.list === list && editing.index === idx ? (
                    <input className="room-input" placeholder="Topics (comma separated)" value={q.topics?.join(', ') || ''} onChange={(e) => onUpdate(idx, 'topics', e.target.value)} />
                  ) : (
                    <div className="cell-text">
                      {q.topics && q.topics.length > 0 ? (
                        <div className="topic-tags-display">
                          {q.topics.map((topic, index) => (
                            <span key={index} className="topic-tag-display">{topic}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">No topics</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="cell cell-actions">
                  {editing && editing.list === list && editing.index === idx ? (
                    <button className="btn" onClick={() => setEditing(null)}>Done</button>
                  ) : (
                    <button className="btn" onClick={() => setEditingWithExpansion(list, idx)}>Edit</button>
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
        {history.map((h: any) => {
          const isCurrent = game && (h.index === game.currentIndex) && game.status === 'running';
          const answered = !!h.answered && !!h.result;
          const playerName = h?.result?.userId ? (players.find(p => p.userId === h.result.userId)?.name || `Player ${h.result.userId.slice(0,4)}`) : undefined;
          const rowClass = answered ? (h.result.correct ? 'history-item history-correct' : 'history-item history-wrong') : (isCurrent ? 'history-item history-current' : 'history-item');
          return (
            <div key={h.index} className={rowClass}>
              <div className="history-content">
                <div className="history-question">
                  <span className="question-text">{h.question?.text}</span>
                  <span className="question-answer">"{h.question?.answer}"</span>
                </div>
                {answered ? (
                  <div className="history-result">
                    <span className="player-name">{playerName}</span>
                    <span className="player-answer">"{h.result.answer}"</span>
                    <span className={`points ${h.result.correct ? 'positive' : 'negative'}`}>
                      {h.result.correct ? '+' : ''}{h.result.delta}
                    </span>
                  </div>
                ) : isCurrent ? (
                  <div className="history-status">
                    {game?.buzzQueue && game.buzzQueue.length > 0 ? (
                      (() => {
                        const firstBuzzerId = game.buzzQueue[0];
                        const buzzerPlayer = players.find(p => p.userId === firstBuzzerId);
                        return `${buzzerPlayer?.name || `Player ${firstBuzzerId.slice(0,4)}`} buzzed`;
                      })()
                    ) : (
                      'In progress…'
                    )}
                  </div>
                ) : null}
              </div>
              <button className="btn" onClick={() => repeatToUpcoming(h.question)}>Repeat</button>
            </div>
          );
        })}

      </div>
    );
  };

  return (
    <div className="stack">
      {/* All controls in one line */}
      <div className="row" style={{ gap: 6, justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="row" style={{ gap: 6 }}>
          <a href={`/?roomId=${roomId}&view=board`} className="btn" target="_blank">Open Board</a>
          <a href={`/?roomId=${roomId}&view=player`} className="btn" target="_blank">Open Player Link</a>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn" onClick={handleAddBlankQuestion}>
            Add
          </button>
          <div className="double-button">
            <button className="btn btn-left" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
            <button 
              className="btn btn-right btn-icon" 
              onClick={() => setShowGenerationSettings(!showGenerationSettings)}
              title="Generation Settings"
            >
              <Settings size={16} />
            </button>
          </div>
          <button className="btn" onClick={shufflePlaylist}>Shuffle</button>
          <button className="btn" onClick={startGame}>Start</button>
          <button className="btn" onClick={nextQuestion}>Next</button>
          <button className="btn" onClick={resetGame}>Reset</button>
        </div>
      </div>

      {/* Generation Settings Panel */}
      {showGenerationSettings && (
        <div className="generation-settings-panel">
          <div className="panel-header">
            <h4>Generation Settings</h4>
            <button 
              className="btn-icon close-btn" 
              onClick={() => setShowGenerationSettings(false)}
              title="Close Settings"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="settings-content">
            <div className="settings-inline">
              <div className="setting-group">
                <select 
                  value={questionCount} 
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="room-select"
                >
                  <option value={1}>1 question</option>
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={20}>20 questions</option>
                </select>
              </div>

              <div className="setting-group">
                <div className="topics-controls">
                  <button 
                    className={`filter-type-btn ${topicFilterType === 'whitelist' ? 'active' : ''}`}
                    onClick={toggleFilterType}
                  >
                    {topicFilterType === 'whitelist' ? 'Whitelist' : 'Blacklist'}
                  </button>
                  <div className="tag-input-container">
                    <div className="tag-input">
                      {topicFilters.map((topic, index) => (
                        <span key={index} className="tag-input-tag">
                          {topic}
                          <button 
                            className="tag-remove-btn" 
                            onClick={() => removeTopic(topic)}
                            title="Remove topic"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      <input 
                        type="text" 
                        placeholder={`Add ${topicFilterType === 'whitelist' ? 'allowed' : 'forbidden'} topics...`}
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTopic.trim()) {
                            e.preventDefault();
                            addTopic();
                          } else if (e.key === 'Backspace' && !newTopic && topicFilters.length > 0) {
                            removeTopic(topicFilters[topicFilters.length - 1]);
                          }
                        }}
                        className="tag-input-field"
                      />
                      {newTopic.trim() && (
                        <button 
                          className="tag-add-btn" 
                          onClick={addTopic}
                          title="Add topic"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="section-card">
        {renderHistory()}
        {renderList('upcoming')}
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