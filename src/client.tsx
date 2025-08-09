import React, { useState, useEffect, createContext, useContext } from 'react';
import ReactDOM from 'react-dom/client';
import { Lobby } from './components/Lobby';
import { RoomLayout } from './components/RoomLayout';
import { Loading } from './components/Loading';
import { useLobbyConnection } from './hooks/useLobbyConnection';
import { useRoomConnection } from './hooks/useRoomConnection';
import { getUserId, generateRandomName } from './utils/userUtils';
import "./styles.css";

declare const PARTYKIT_HOST: string;

// Create a context for shared query parameters
interface QueryParamsContextType {
  queryParams: {
    roomId: string | null;
    view: string;
  };
  updateQueryParams: (params: { roomId?: string | null; view?: string }) => void;
}

const QueryParamsContext = createContext<QueryParamsContextType | null>(null);

// Custom hook to use the shared query parameters context
export function useQueryParams() {
  const context = useContext(QueryParamsContext);
  if (!context) {
    throw new Error('useQueryParams must be used within a QueryParamsProvider');
  }
  return context;
}

// Provider component for query parameters
function QueryParamsProvider({ children }: { children: React.ReactNode }) {
  const [queryParams, setQueryParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('roomId');
    const viewParam = urlParams.get('view');
    return {
      roomId,
      view: viewParam || (roomId ? 'admin' : 'lobby')
    };
  });

  const updateQueryParams = (params: { roomId?: string | null; view?: string }) => {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (params.roomId !== undefined) {
      if (params.roomId) {
        urlParams.set('roomId', params.roomId);
      } else {
        urlParams.delete('roomId');
      }
    }
    
    if (params.view !== undefined) {
      if (params.view) {
        urlParams.set('view', params.view);
      } else {
        urlParams.delete('view');
      }
    }

    const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
    window.history.pushState({}, '', newUrl);
    
    const nextRoomId = urlParams.get('roomId');
    const nextViewParam = urlParams.get('view');
    setQueryParams({
      roomId: nextRoomId,
      view: nextViewParam || (nextRoomId ? 'admin' : 'lobby')
    });
  };

  // Listen for browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const roomId = urlParams.get('roomId');
      const viewParam = urlParams.get('view');
      setQueryParams({
        roomId,
        view: viewParam || (roomId ? 'admin' : 'lobby')
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <QueryParamsContext.Provider value={{ queryParams, updateQueryParams }}>
      {children}
    </QueryParamsContext.Provider>
  );
}

function NotFound() {
  return (
    <div className="container">
      <div className="main-content">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderRadius: '8px',
          margin: '10px',
          padding: '40px 20px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}>
          <h2 style={{ color: '#475569', marginBottom: '20px' }}>Page Not Found</h2>
          <p style={{ color: '#64748b', textAlign: 'center' }}>
            The page you're looking for doesn't exist.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #475569 0%, #64748b 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Go to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const { queryParams, updateQueryParams } = useQueryParams();

  const handleRoomCreated = (roomId: string) => {
    setIsLoading(false);
    // Default to admin view without specifying view param
    updateQueryParams({ roomId });
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
    // Player view by default for joiners
    updateQueryParams({ roomId, view: 'play' });
  };

  const handleBackToLobby = () => {
    updateQueryParams({ roomId: null, view: 'lobby' });
  };

  if (isLoading) {
    return <Loading playerName={playerName} />;
  }

  // Route based on query parameters
  if (queryParams.roomId) {
    return (
      <RoomLayout
        playerName={playerName}
        userId={userId}
        onPlayerNameChange={handlePlayerNameChange}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  // Default to lobby view
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

function App() {
  return (
    <QueryParamsProvider>
      <AppContent />
    </QueryParamsProvider>
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 