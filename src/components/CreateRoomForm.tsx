import React, { useState } from 'react';

interface CreateRoomFormProps {
  onCreateRoom: (name: string) => void;
}

export function CreateRoomForm({ onCreateRoom }: CreateRoomFormProps) {
  const [roomName, setRoomName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim());
      setRoomName('');
    }
  };

  return (
    <div className="create-room-section">
      <h3>🏠 Create New Room</h3>
      <form onSubmit={handleSubmit} className="create-room-form">
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name..."
          className="room-input"
          required
        />
        <button type="submit" className="btn btn-primary">
          Create Room
        </button>
      </form>
    </div>
  );
} 