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
  type: 'room-info' | 'chat' | 'player-joined' | 'player-left';
  data?: any;
}

export function useRoomConnection(roomId: string | null, playerName: string, userId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [roomName, setRoomName] = useState('');
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
              setRoomName(message.data.roomName);
              setPlayers(message.data.players || []);
            }
            break;
          case 'chat':
            if (message.data) {
              setChatMessages(prev => [...prev, message.data]);
            }
            break;
          case 'player-joined':
            if (message.data && message.data.player) {
              // Only show system message if it's not the current user
              if (message.data.player.userId !== userId) {
                setChatMessages(prev => [...prev, {
                  player: 'System',
                  message: `${message.data.player.name} joined the room`,
                  timestamp: Date.now()
                }]);
              }
            }
            break;
          case 'player-left':
            if (message.data && message.data.player) {
              // Only show system message if it's not the current user
              if (message.data.player.userId !== userId) {
                setChatMessages(prev => [...prev, {
                  player: 'System',
                  message: `${message.data.player.name} left the room`,
                  timestamp: Date.now()
                }]);
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing room message:', error);
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
        data: { message }
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