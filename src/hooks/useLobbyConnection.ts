import { useState, useEffect, useRef } from 'react';
import { PartySocket } from 'partysocket';

declare const PARTYKIT_HOST: string;

interface RoomInfo {
  id: string;
  name: string;
  createdAt: number;
}

interface LobbyMessage {
  type: 'rooms-list' | 'room-created' | 'clear-storage';
  data?: any;
  rooms?: RoomInfo[];
  roomId?: string;
}

export function useLobbyConnection(onRoomCreated?: (roomId: string) => void) {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);
  const onRoomCreatedRef = useRef(onRoomCreated);

  // Update the ref when the callback changes
  useEffect(() => {
    onRoomCreatedRef.current = onRoomCreated;
  }, [onRoomCreated]);

  useEffect(() => {
    // Don't create a new connection if one already exists
    if (socketRef.current) {
      return;
    }

    const socket = new PartySocket({
      host: PARTYKIT_HOST,
      party: 'lobby',
      room: 'lobby'
    });

    socketRef.current = socket;

    socket.addEventListener('open', () => {
      console.log('Connected to lobby');
      setIsConnected(true);
    });

    socket.addEventListener('close', () => {
      console.log('Disconnected from lobby');
      setIsConnected(false);
    });

    socket.addEventListener('message', (event) => {
      try {
        const message: LobbyMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'rooms-list':
            if (message.data) {
              setRooms(message.data);
            } else if (message.rooms) {
              setRooms(message.rooms);
            }
            break;
          case 'room-created':
            if (message.data && message.data.id && onRoomCreatedRef.current) {
              onRoomCreatedRef.current(message.data.id);
            } else if (message.roomId && onRoomCreatedRef.current) {
              onRoomCreatedRef.current(message.roomId);
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing lobby message:', error);
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const createRoom = (name: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'create-room',
        data: { name }
      }));
    }
  };

  const joinRoom = (roomId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'join-room',
        data: { roomId }
      }));
    }
  };

  const clearStorage = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'clear-storage'
      }));
    }
  };

  return {
    rooms,
    isConnected,
    createRoom,
    joinRoom,
    clearStorage
  };
} 