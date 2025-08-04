import React from 'react';

interface RoomInfo {
  id: string;
  name: string;
  createdAt: number;
}

interface RoomsListProps {
  rooms: RoomInfo[];
  onJoinRoom: (roomId: string) => void;
}

export function RoomsList({ rooms, onJoinRoom }: RoomsListProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="rooms-section">
      <h3>🚪 Available Rooms</h3>
      <div className="rooms-list">
        {rooms.length === 0 ? (
          <div className="no-rooms">
            <p>No rooms available. Create one to get started!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="room-item">
              <div className="room-info">
                <h4>{room.name}</h4>
                <p>Created: {formatDate(room.createdAt)}</p>
              </div>
              <button
                onClick={() => onJoinRoom(room.id)}
                className="btn btn-success join-btn"
              >
                Join Room
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 