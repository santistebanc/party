import { useState, useEffect, useRef } from 'react';
import { PartySocket } from 'partysocket';

declare const PARTYKIT_HOST: string;

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface ChatMessage {
  id: string;
  type: "chat" | "system";
  player?: Player;
  message: string;
  timestamp: number;
}

interface RoomMessage {
  type: 'room-info' | 'chat' | 'player-joined' | 'player-left';
  data?: any;
}

export function useRoomConnection(roomId: string | null, playerName: string, userId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    // Clean up previous connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    if (!roomId) {
      setIsConnected(false);
      return;
    }

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: 'room',
      room: roomId
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('Connected to room');
      setIsConnected(true);
      
      // Join the room
      socket.send(JSON.stringify({
        type: 'join',
        data: {
          name: playerName,
          userId: userId
        }
      }));
    });

    socket.addEventListener('close', () => {
      console.log('Disconnected from room');
      setIsConnected(false);
    });

    socket.addEventListener('message', (event) => {
      try {
        const message: RoomMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'room-info':
            if (message.data) {
              setCurrentRoomId(message.data.roomId);
              setPlayers(message.data.players || []);
            }
            break;
          case 'chat':
            if (message.data) {
              setChatMessages(prev => [...prev, {
                id: `chat-${Date.now()}-${Math.random()}`,
                type: 'chat',
                player: message.data.player,
                message: message.data.message,
                timestamp: message.data.timestamp
              }]);
            }
            break;
          case 'player-joined':
            if (message.data && message.data.player) {
              // Only show system message if it's not the current user
              if (message.data.player.userId !== userId) {
                setChatMessages(prev => [...prev, {
                  id: `system-${Date.now()}-${Math.random()}`,
                  type: 'system',
                  message: `${message.data.player.name} joined the room`,
                  timestamp: Date.now()
                }]);
              }
              
              // Update players list
              setPlayers(prev => {
                const existingPlayer = prev.find(p => p.userId === message.data.player.userId);
                if (!existingPlayer) {
                  return [...prev, message.data.player];
                }
                return prev;
              });
            }
            break;
          case 'player-left':
            if (message.data && message.data.player) {
              // Only show system message if it's not the current user
              if (message.data.player.userId !== userId) {
                setChatMessages(prev => [...prev, {
                  id: `system-${Date.now()}-${Math.random()}`,
                  type: 'system',
                  message: `${message.data.player.name} left the room`,
                  timestamp: Date.now()
                }]);
              }
              
              // Update players list
              setPlayers(prev => prev.filter(p => p.userId !== message.data.player.userId));
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [roomId, playerName, userId]);

  const sendChat = (message: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        data: {
          message: message
        }
      }));
    }
  };

  const leaveRoom = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setPlayers([]);
    setChatMessages([]);
  };

  return {
    players,
    chatMessages,
    isConnected,
    sendChat,
    leaveRoom
  };
} 