import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import PartySocket from "partysocket";
import "./styles.css";

declare const PARTYKIT_HOST: string;

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
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
function useLobbyConnection() {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      room: "lobby",
    });

    socket.addEventListener("open", () => {
      setIsConnected(true);
    });

    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "rooms-list") {
          setRooms(message.data);
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

  const createRoom = (name: string, maxPlayers: number) => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({
        type: "create-room",
        data: { name, maxPlayers }
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

  return { rooms, isConnected, createRoom, joinRoom };
}

// Custom hook for room connection
function useRoomConnection(roomId: string | null, playerName: string) {
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
    });

    socket.addEventListener("open", () => {
      setIsConnected(true);
      // Join the room
      socket.send(JSON.stringify({
        type: "join",
        data: { name: playerName }
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
            setChatMessages(prev => [...prev, {
              player: "System",
              message: `${message.data.player.name} joined the room`,
              timestamp: Date.now()
            }]);
            break;
          case "player-left":
            setChatMessages(prev => [...prev, {
              player: "System",
              message: `${message.data.player.name} left the room`,
              timestamp: Date.now()
            }]);
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

// Player Name Component
function PlayerNameForm({ onNameSet }: { onNameSet: (name: string) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSet(name.trim());
    }
  };

  return (
    <div className="player-info">
      <form onSubmit={handleSubmit} className="name-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          className="name-input"
          required
        />
        <button type="submit" className="btn btn-primary">
          Set Name
        </button>
      </form>
    </div>
  );
}

// Create Room Component
function CreateRoomForm({ onCreateRoom }: { onCreateRoom: (name: string, maxPlayers: number) => void }) {
  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim(), maxPlayers);
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
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="room-input"
        >
          <option value={2}>2 players</option>
          <option value={4}>4 players</option>
          <option value={6}>6 players</option>
          <option value={8}>8 players</option>
        </select>
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
              <p>Players: {room.playerCount}/{room.maxPlayers}</p>
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
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
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
  onLeaveRoom 
}: {
  roomName: string;
  players: Player[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onLeaveRoom: () => void;
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
    </div>
  );
}

// Main App Component
function App() {
  const [playerName, setPlayerName] = useState("");
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  
  const { rooms, isConnected, createRoom, joinRoom } = useLobbyConnection();
  const { 
    players, 
    chatMessages, 
    isConnected: isRoomConnected, 
    roomName, 
    sendChat, 
    leaveRoom 
  } = useRoomConnection(currentRoom, playerName);

  const handleCreateRoom = (name: string, maxPlayers: number) => {
    if (!playerName) {
      alert("Please set your name first!");
      return;
    }
    createRoom(name, maxPlayers);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!playerName) {
      alert("Please set your name first!");
      return;
    }
    setCurrentRoom(roomId);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setCurrentRoom(null);
  };

  if (!playerName) {
    return (
      <div className="container">
        <header className="header">
          <h1>🎈 PartyKit Lobby</h1>
          <p>Create and join rooms to start partying!</p>
        </header>
        
        <div className="main-content">
          <PlayerNameForm onNameSet={setPlayerName} />
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
            <button 
              onClick={() => setPlayerName("")} 
              className="btn btn-secondary"
            >
              Change Name
            </button>
          </div>
          
          <CreateRoomForm onCreateRoom={handleCreateRoom} />
          <RoomsList rooms={rooms} onJoinRoom={handleJoinRoom} />
        </div>
      </div>
    </div>
  );
}

// Initialize React app
const root = ReactDOM.createRoot(document.getElementById('app') as HTMLElement);
root.render(<App />); 