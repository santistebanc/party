import { useState, useEffect, useRef } from 'react';
import { PartySocket } from 'partysocket';

declare const PARTYKIT_HOST: string;

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

interface RoomMessage {
  type: 'players-list' | 'chat-message' | 'player-joined' | 'player-left' | 'room-name';
  players?: Player[];
  message?: ChatMessage;
  player?: Player;
  roomName?: string;
}

export function useRoomConnection(roomId: string | null, playerName: string, userId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
  const socketRef = useRef<PartySocket | null>(null);

  useEffect(() => {
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
          case 'players-list':
            if (message.players) {
              setPlayers(message.players);
            }
            break;
          case 'chat-message':
            if (message.message) {
              setChatMessages(prev => [...prev, message.message!]);
            }
            break;
          case 'player-joined':
            if (message.player) {
              // Only show system message if it's not the current user
              if (message.player.id !== userId) {
                setChatMessages(prev => [...prev, {
                  player: 'System',
                  message: `${message.player.name} joined the room`,
                  timestamp: Date.now()
                }]);
              }
            }
            break;
          case 'player-left':
            if (message.player) {
              // Only show system message if it's not the current user
              if (message.player.id !== userId) {
                setChatMessages(prev => [...prev, {
                  player: 'System',
                  message: `${message.player.name} left the room`,
                  timestamp: Date.now()
                }]);
              }
            }
            break;
          case 'room-name':
            if (message.roomName) {
              setRoomName(message.roomName);
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing room message:', error);
      }
    });

    return () => {
      socket.close();
    };
  }, [roomId, playerName, userId]);

  const sendChat = (message: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chat',
        message
      }));
    }
  };

  const leaveRoom = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'leave'
      }));
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