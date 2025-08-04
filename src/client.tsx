import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import PartySocket from "partysocket";
import QRCode from 'qrcode';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import type { Config } from 'unique-names-generator';
import "./styles.css";

declare const PARTYKIT_HOST: string;

interface RoomInfo {
  id: string;
  name: string;
  maxPlayers: number;
  createdAt: number;
}

interface Player {
  id: string;
  name: string;
  joinedAt: number;
}

interface ChatMessage {
  player: string;
  message: string;
  timestamp: number;
}

// Custom hook for lobby connection
function useLobbyConnection(onRoomCreated?: (roomId: string) => void) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: "lobby",
      party: "lobby",
    });

    socket.addEventListener("open", () => {
      setIsConnected(true);
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "rooms-list") {
          setRooms(message.data);
        } else if (message.type === "storage-cleared") {
          alert(message.data.message);
        } else if (message.type === "room-created" && onRoomCreated) {
          onRoomCreated(message.data.id);
        }
      } catch (error) {
        console.error("Error parsing lobby message:", error);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  const createRoom = (name: string) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "create-room",
        data: { name }
      }));
    }
  };

  const joinRoom = (roomId: string) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "join-room",
        data: { roomId }
      }));
    }
  };

  const clearStorage = () => {
    if (socketRef.current && confirm("Are you sure you want to clear all rooms? This action cannot be undone.")) {
      socketRef.current.send(JSON.stringify({
        type: "clear-storage"
      }));
    }
  };

  return { rooms, isConnected, createRoom, joinRoom, clearStorage };
}

// Custom hook for room connection
function useRoomConnection(roomId: string | null, playerName: string, userId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState("");
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    if (!roomId || !playerName) return;

                    const socket = new PartySocket({
                  host: PARTYKIT_HOST,
                  room: `room-${roomId}`,
                  party: "room",
                });

    socket.addEventListener("open", () => {
      setIsConnected(true);
      // Join the room with user ID
      socket.send(JSON.stringify({
        type: "join",
        data: { name: playerName, userId }
      }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "room-info":
            setPlayers(message.data.players);
            setRoomName(message.data.roomName);
            break;
          case "player-joined":
            // Only show join message if it's not the current user
            if (message.data.player.userId !== userId) {
              setChatMessages(prev => [...prev, {
                player: "System",
                message: `${message.data.player.name} joined the room`,
                timestamp: Date.now()
              }]);
            }
            break;
          case "player-left":
            // Only show leave message if it's not the current user
            if (message.data.player.userId !== userId) {
              setChatMessages(prev => [...prev, {
                player: "System",
                message: `${message.data.player.name} left the room`,
                timestamp: Date.now()
              }]);
            }
            break;
          case "chat":
            setChatMessages(prev => [...prev, {
              player: message.data.player,
              message: message.data.message,
              timestamp: message.data.timestamp
            }]);
            break;
        }
      } catch (error) {
        console.error("Error parsing room message:", error);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.close();
    };
  }, [roomId, playerName]);

  const sendChat = (message: string) => {
    if (socketRef.current && message.trim()) {
      socketRef.current.send(JSON.stringify({
        type: "chat",
        data: { message }
      }));
    }
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "leave" }));
      socketRef.current.close();
    }
  };

  return { 
    players, 
    chatMessages, 
    isConnected, 
    roomName, 
    sendChat, 
    leaveRoom 
  };
}



// Create Room Component
function CreateRoomForm({ onCreateRoom }: { onCreateRoom: (name: string) => void }) {
  const [roomName, setRoomName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim());
      setRoomName("");
    }
  };

  return (
    <div className="create-room-section">
      <h3>Create a New Room</h3>
      <form onSubmit={handleSubmit} className="create-room-form">
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Room name"
          className="room-input"
          required
        />
        <button type="submit" className="btn btn-success">
          Create Room
        </button>
      </form>
    </div>
  );
}

// Rooms List Component
function RoomsList({ 
  rooms, 
  onJoinRoom 
}: { 
  rooms: RoomInfo[]; 
  onJoinRoom: (roomId: string) => void;
}) {
  if (rooms.length === 0) {
    return (
      <div className="rooms-section">
        <h3>Available Rooms</h3>
        <p className="no-rooms">No rooms available. Create one!</p>
      </div>
    );
  }

  return (
    <div className="rooms-section">
      <h3>Available Rooms</h3>
      <div className="rooms-list">
        {rooms.map(room => (
          <div key={room.id} className="room-item">
            <div className="room-info">
              <h4>{room.name}</h4>
              <p>Created: {new Date(room.createdAt).toLocaleTimeString()}</p>
            </div>
            <button 
              className="btn btn-primary join-btn"
              onClick={() => onJoinRoom(room.id)}
            >
              Join
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chat Component
function Chat({ 
  messages, 
  onSendMessage 
}: { 
  messages: ChatMessage[]; 
  onSendMessage: (message: string) => void;
}) {
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage("");
      // Keep focus on input for mobile
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="chat-section">
      <h4>Chat</h4>
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.player === "System" ? "system" : "player"}`}>
            <span className="timestamp">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
            {msg.player !== "System" && (
              <span className="player-name">{msg.player}:</span>
            )}
            <span className="message">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary">
          Send
        </button>
      </form>
    </div>
  );
}

// Players List Component
function PlayersList({ players }: { players: Player[] }) {
  return (
    <div className="players-section">
      <h4>Players ({players.length})</h4>
      <div className="players-list">
        {players.length === 0 ? (
          <p className="no-players">No players in room</p>
        ) : (
          players.map(player => (
            <div key={player.id} className="player-item">
              <span className="player-name">{player.name}</span>
              <span className="player-joined">
                Joined: {new Date(player.joinedAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Room Component
function Room({ 
  roomName, 
  players, 
  chatMessages, 
  onSendMessage, 
  onLeaveRoom,
  roomId
}: {
  roomName: string;
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onLeaveRoom: () => void;
  roomId: string;
}) {
  return (
    <div className="room-section">
      <div className="room-header">
        <h2>Room: {roomName}</h2>
        <button onClick={onLeaveRoom} className="btn btn-danger">
          Leave Room
        </button>
      </div>
      
      <div className="room-content">
        <PlayersList players={players} />
        <Chat messages={chatMessages} onSendMessage={onSendMessage} />
      </div>
      
      <QRCodeDisplay roomId={roomId} />
    </div>
  );
}

// QR Code Component
function QRCodeDisplay({ roomId }: { roomId: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const roomUrl = `${window.location.origin}?room=${roomId}`;
        const dataUrl = await QRCode.toDataURL(roomUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQR();
  }, [roomId]);

  const copyRoomUrl = () => {
    const roomUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      alert('Room URL copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = roomUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Room URL copied to clipboard!');
    });
  };

  return (
    <div className="qr-section">
      <h4>Share Room</h4>
      <div className="qr-container">
        {isGenerating ? (
          <div className="qr-loading">
            <div className="loading-spinner"></div>
            <p>Generating QR code...</p>
          </div>
        ) : (
          <>
            <img src={qrDataUrl} alt="QR Code" className="qr-code" />
            <button onClick={copyRoomUrl} className="btn btn-secondary">
              Copy Room URL
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Generate or retrieve user ID
function getUserId(): string {
  let userId = localStorage.getItem('partykit-user-id');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('partykit-user-id', userId);
  }
  return userId;
}

// Generate random name utility
function generateRandomName(): string {
  const config: Config = {
    dictionaries: [adjectives, animals],
    separator: '_',
    length: 2,
  };
  return uniqueNamesGenerator(config);
}

// Main App Component
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



  const handleClearPlayerName = () => {
    setPlayerName("");
    // Remove from localStorage
    localStorage.removeItem('partykit-player-name');
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
    return (
      <div className="container">
        <header className="header">
          <h1>🎈 PartyKit Lobby</h1>
          <p>Loading...</p>
        </header>
        
        <div className="main-content">
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Connecting to room...</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentRoom) {
    return (
      <div className="container">
        <header className="header">
          <h1>🎈 PartyKit Lobby</h1>
          <p>Create and join rooms to start partying!</p>
        </header>
        
        <div className="main-content">
          <Room
            roomName={roomName}
            players={players}
            chatMessages={chatMessages}
            onSendMessage={sendChat}
            onLeaveRoom={handleLeaveRoom}
            roomId={currentRoom}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🎈 PartyKit Lobby</h1>
        <p>Create and join rooms to start partying!</p>
      </header>
      
      <div className="main-content">
                  <div className="lobby-section">
            <div className="player-info">
              <p><strong>Player:</strong> {playerName}</p>
              <p className="user-id"><strong>ID:</strong> {userId}</p>
              <button 
                onClick={handleClearPlayerName} 
                className="btn btn-secondary"
              >
                Change Name
              </button>
            </div>
            
            <CreateRoomForm onCreateRoom={handleCreateRoom} />
            <RoomsList rooms={rooms} onJoinRoom={handleJoinRoom} />
            
            <div className="admin-section">
              <h3>Admin Tools</h3>
              <button 
                onClick={clearStorage} 
                className="btn btn-danger"
              >
                Clear All Rooms
              </button>
            </div>
          </div>
      </div>
    </div>
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 