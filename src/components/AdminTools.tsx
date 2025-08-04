import React from 'react';

interface AdminToolsProps {
  onClearStorage: () => void;
}

export function AdminTools({ onClearStorage }: AdminToolsProps) {
  return (
    <div className="admin-section">
      <h3>Admin Tools</h3>
      <button 
        onClick={onClearStorage} 
        className="btn btn-danger"
      >
        Clear All Rooms
      </button>
    </div>
  );
} 