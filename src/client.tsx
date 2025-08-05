import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Lobby } from './components/Lobby';
import { Room } from './components/Room';
import { Loading } from './components/Loading';
import { useLobbyConnection } from './hooks/useLobbyConnection';
import { useRoomConnection } from './hooks/useRoomConnection';
import { getUserId, generateRandomName } from './utils/userUtils';
import "./styles.css";

declare const PARTYKIT_HOST: string;

function App() {
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
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [directJoinRoom, setDirectJoinRoom] = useState<string | null>(null);
  const userId = getUserId();

  // Check for room parameter in URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      setDirectJoinRoom(roomParam);
    }
  }, []);
  
  const { rooms, isConnected, createRoom, joinRoom, clearStorage } = useLobbyConnection((roomId) => {
    // When a room is created, automatically navigate to it
    setCurrentRoom(roomId);
    setIsLoading(false);
  });

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
  const { 
    players, 
    chatMessages, 
    isConnected: isRoomConnected, 
    roomId: currentRoomId, 
    sendChat, 
    leaveRoom 
  } = useRoomConnection(currentRoom, playerName, userId);

  // Clear loading state when room is connected
  useEffect(() => {
    if (isRoomConnected && isLoading) {
      setIsLoading(false);
    }
  }, [isRoomConnected, isLoading]);

  // Handle direct room joining
  useEffect(() => {
    if (directJoinRoom && !currentRoom) {
      handleJoinRoom(directJoinRoom);
    }
  }, [directJoinRoom, currentRoom]);

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
    setCurrentRoom(roomId);
    // Clear URL parameter after joining
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
    setDirectJoinRoom(null);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setCurrentRoom(null);
    setIsLoading(false);
  };

  if (isLoading) {
    return <Loading />;
  }

  if (currentRoom) {
    return (
      <Room
        roomId={currentRoom}
        players={players}
        chatMessages={chatMessages}
        onSendMessage={sendChat}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <Lobby
      playerName={playerName}
      userId={userId}
      rooms={rooms}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      onPlayerNameChange={handlePlayerNameChange}
    />
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 