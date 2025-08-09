import React, { useState } from 'react';
import { User } from 'lucide-react';

interface RoomSettingsProps {
  roomId: string;
  onPlayerNameChange: (name: string) => void;
}

export function RoomSettings({ roomId, onPlayerNameChange }: RoomSettingsProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const handleEditName = () => {
    setIsEditingName(true);
    setEditName('');
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onPlayerNameChange(editName.trim());
    }
    setIsEditingName(false);
    setEditName('');
  };

  const handleCancelName = () => {
    setIsEditingName(false);
    setEditName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editName.trim()) {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelName();
    }
  };

  return (
    <div className="room-settings">
      <div className="settings-content">
        
        <div className="settings-section">
          <h4><User size={16} /> Player Name</h4>
          {isEditingName ? (
            <div className="name-edit-section">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter new name..."
                className="name-input"
                autoFocus
              />
              <div className="name-edit-buttons">
                <button 
                  onClick={handleSaveName} 
                  className="btn btn-primary"
                  disabled={!editName.trim()}
                >
                  Save
                </button>
                <button 
                  onClick={handleCancelName} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleEditName} 
              className="btn btn-secondary"
            >
              Change Name
            </button>
          )}
        </div>
        
        {/* Room actions (leave) removed as requested */}
      </div>
    </div>
  );
} 