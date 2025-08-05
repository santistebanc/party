import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Lobby } from './components/Lobby';
import { RoomLayout } from './components/RoomLayout';
import { Loading } from './components/Loading';
import { useLobbyConnection } from './hooks/useLobbyConnection';
import { useRoomConnection } from './hooks/useRoomConnection';
import { getUserId, generateRandomName } from './utils/userUtils';
import "./styles.css";

declare const PARTYKIT_HOST: string;

function AppContent() {
  const [playerName, setPlayerName] = useState(() => {
    // Try to get saved name from localStorage, or generate a random one
    const savedName = localStorage.getItem('partykit-player-name');
    if (savedName) {
      return savedName;
    } else {
      // Generate a random name and save it to localStorage
      const randomName = generateRandomName();
      localStorage.setItem('partykit-player-name', randomName);
      return randomName;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const userId = getUserId();
  const navigate = useNavigate();

  const handleRoomCreated = (roomId: string) => {
    setIsLoading(false);
    navigate(`/room/${roomId}`);
  };

  const { rooms, isConnected, createRoom, joinRoom, clearStorage } = useLobbyConnection(handleRoomCreated);
  
  // Expose clearStorage to window for console access
  React.useEffect(() => {
    (window as any).clearAllRooms = () => {
      console.log('Clearing all rooms...');
      clearStorage();
    };
    
    (window as any).getAllRooms = () => {
      console.log('Available rooms:', rooms);
      return rooms;
    };
    
    console.log('💡 Developer tips:');
    console.log('  - Use getAllRooms() to see available rooms');
    console.log('  - Use clearAllRooms() to clear all rooms');
  }, [clearStorage, rooms]);

  const handlePlayerNameChange = (newName: string) => {
    setPlayerName(newName);
    localStorage.setItem('partykit-player-name', newName);
  };

  const handleCreateRoom = () => {
    setIsLoading(true);
    createRoom();
  };

  const handleJoinRoom = (roomId: string) => {
    setIsLoading(true);
    navigate(`/room/${roomId}`);
  };

  if (isLoading) {
    return <Loading playerName={playerName} />;
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <Lobby
            playerName={playerName}
            userId={userId}
            rooms={rooms}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPlayerNameChange={handlePlayerNameChange}
          />
        } 
      />
      <Route 
        path="/room/:roomId/*" 
        element={
          <RoomLayout
            playerName={playerName}
            userId={userId}
            onPlayerNameChange={handlePlayerNameChange}
          />
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 