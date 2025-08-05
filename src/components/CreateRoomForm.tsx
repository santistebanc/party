import React, { useState } from 'react';
import { Plus, Users, ArrowRight } from 'lucide-react';

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
    <div className="room-actions">
      <button onClick={onCreateRoom} className="create-room-btn">
        <Plus size={18} /> Create Room
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
          <button type="submit" className="btn btn-primary">
            <ArrowRight size={16} /> Join Room
          </button>
        </form>
      </div>
    </div>
  );
} 