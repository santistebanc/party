import React, { useState } from 'react';

interface CreateRoomFormProps {
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function CreateRoomForm({ onCreateRoom, onJoinRoom }: CreateRoomFormProps) {
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      onJoinRoom(roomId.trim().toUpperCase());
      setRoomId('');
    }
  };

  return (
    <div className="create-room-section">
      <div className="room-actions">
        <button 
          onClick={onCreateRoom} 
          className="btn btn-primary create-room-btn"
        >
          Create Room
        </button>
        
        <div className="join-room-form">
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID..."
              className="room-input"
              maxLength={6}
            />
            <button 
              type="submit" 
              className="btn btn-success"
              disabled={!roomId.trim()}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 