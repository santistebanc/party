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
  const { 
    players, 
    chatMessages, 
    isConnected: isRoomConnected, 
    roomName, 
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

  const handleGenerateRandomName = () => {
    const randomName = generateRandomName();
    setPlayerName(randomName);
    localStorage.setItem('partykit-player-name', randomName);
  };

  const handleCreateRoom = (name: string) => {
    setIsLoading(true);
    createRoom(name);
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
        roomName={roomName}
        players={players}
        chatMessages={chatMessages}
        onSendMessage={sendChat}
        onLeaveRoom={handleLeaveRoom}
        roomId={currentRoom}
      />
    );
  }

  return (
    <Lobby
      playerName={playerName}
      userId={userId}
      rooms={rooms}
      onJoinRoom={handleJoinRoom}
      onCreateRoom={handleCreateRoom}
      onClearStorage={clearStorage}
      onGenerateRandomName={handleGenerateRandomName}
      onPlayerNameChange={handlePlayerNameChange}
    />
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 