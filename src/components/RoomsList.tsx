import React from 'react';

interface RoomInfo {
  id: string;
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
      {rooms.length === 0 ? (
        <div className="no-rooms">
          <p>No rooms available. Create one to get started!</p>
        </div>
      ) : (
        <div className="rooms-list">
          {rooms.map((room) => (
            <div key={room.id} className="room-item">
              <div className="room-info">
                <h4>{room.id}</h4>
                <p>Created: {formatDate(room.createdAt)}</p>
              </div>
              <button 
                onClick={() => onJoinRoom(room.id)} 
                className="btn btn-success join-btn"
              >
                Join Room
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 