import React, { useState } from 'react';

interface PlayerInfoProps {
  playerName: string;
  userId: string;
  onPlayerNameChange: (name: string) => void;
  onGenerateRandomName: () => void;
}

export function PlayerInfo({
  playerName,
  userId,
  onPlayerNameChange,
  onGenerateRandomName
}: PlayerInfoProps) {
  const [isChangingName, setIsChangingName] = useState(false);
  const [newName, setNewName] = useState('');

  const handleChangeName = () => {
    setIsChangingName(true);
    setNewName(playerName);
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      onPlayerNameChange(newName.trim());
    }
    setIsChangingName(false);
    setNewName('');
  };

  const handleCancelName = () => {
    setIsChangingName(false);
    setNewName('');
  };

  return (
    <div className="player-info">
      <p>
        <strong>Player:</strong> 
        {isChangingName ? (
          <span className="inline-name-edit">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  handleSaveName();
                } else if (e.key === 'Escape') {
                  handleCancelName();
                }
              }}
              className="inline-name-input"
              autoFocus
            />
            <button 
              onClick={handleSaveName} 
              className="btn btn-primary btn-small"
              disabled={!newName.trim()}
              title="Save name"
            >
              ✓
            </button>
            <button 
              onClick={handleCancelName} 
              className="btn btn-secondary btn-small"
              title="Cancel"
            >
              ✕
            </button>
          </span>
        ) : (
          <span className="player-name-display">
            {playerName}
            <button 
              onClick={handleChangeName} 
              className="btn btn-secondary btn-small"
              title="Change name"
            >
              ✏️
            </button>
          </span>
        )}
      </p>
      <p className="user-id"><strong>ID:</strong> {userId}</p>
      <button 
        onClick={onGenerateRandomName} 
        className="btn btn-secondary"
      >
        Generate Random Name
      </button>
    </div>
  );
} 