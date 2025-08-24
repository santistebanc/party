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

export type GameStatus = "idle" | "running" | "await-next" | "finished";
export interface Question { id: string; text: string; answer: string; points: number; }
export interface GameState {
  status: GameStatus;
  questions: Question[];
  currentIndex: number;
  buzzQueue: string[];
  currentResponder?: string;
  scores: Record<string, number>;
  lastResult?: { userId: string; correct: boolean; delta: number; answer?: string };
  perQuestion?: { answered: boolean; result?: { userId: string; correct: boolean; delta: number; answer?: string } }[];
}

interface RoomMessage {
  type: 'room-info' | 'chat' | 'player-joined' | 'player-left' | 'game-update' | 'admin-state';
  data?: any;
}

type RoomConnectionOptions = {
  autoJoin?: boolean;
};

export function useRoomConnection(
  roomId: string | null,
  playerName: string,
  userId: string,
  options: RoomConnectionOptions = {}
) {
  const { autoJoin = true } = options;
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState('');
  const [game, setGame] = useState<GameState | undefined>(undefined);
  const [adminState, setAdminState] = useState<{ upcoming: Question[]; bank: Question[]; history: any[] } | undefined>(undefined);
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
    ;(window as any).roomSocket = socket; // optional global for debugging

    socket.addEventListener('open', () => {
      console.log('Connected to room');
      setIsConnected(true);
      
      // Join the room optionally
      if (autoJoin) {
        socket.send(JSON.stringify({
          type: 'join',
          data: {
            name: playerName,
            userId: userId
          }
        }));
      }
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
          case 'game-update':
            setGame(message.data);
            break;
          case 'admin-state':
            setAdminState(message.data);
            break;
          case 'admin-generate-questions-success':
            // Questions were generated successfully, admin state will be updated
            break;
          case 'admin-generate-questions-error':
            console.error('AI question generation failed:', message.data?.error);
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
  }, [roomId, playerName, userId, autoJoin]);

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

  // Game action helpers
  const startGame = () => socketRef.current?.send(JSON.stringify({ type: 'start-game' }));
  const setQuestions = (questions: Question[]) => socketRef.current?.send(JSON.stringify({ type: 'admin-set-upcoming', data: { questions } }));
  const setUpcoming = (questions: Question[]) => socketRef.current?.send(JSON.stringify({ type: 'admin-set-upcoming', data: { questions } }));
  const setBank = (questions: Question[]) => socketRef.current?.send(JSON.stringify({ type: 'admin-set-bank', data: { questions } }));
  const repeatQuestion = (question: Question) => socketRef.current?.send(JSON.stringify({ type: 'admin-repeat-question', data: { question } }));
  const buzz = () => socketRef.current?.send(JSON.stringify({ type: 'buzz' }));
  const submitAnswer = (text: string) => socketRef.current?.send(JSON.stringify({ type: 'submit-answer', data: { text } }));
  const nextQuestion = () => socketRef.current?.send(JSON.stringify({ type: 'next-question' }));
  const finishGame = () => socketRef.current?.send(JSON.stringify({ type: 'finish-game' }));
  const resetGame = () => socketRef.current?.send(JSON.stringify({ type: 'reset-game' }));
  const generateQuestions = (settings?: { questionCount: number; topicFilterType: 'whitelist' | 'blacklist'; topicFilters: string[] }) => 
    socketRef.current?.send(JSON.stringify({ type: 'admin-generate-questions', data: settings }));
  const addQuestion = (question: Question) => socketRef.current?.send(JSON.stringify({ type: 'admin-add-question', data: { question } }));

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
    game,
    adminState,
    sendChat,
    leaveRoom,
    actions: { startGame, setQuestions, setUpcoming, setBank, repeatQuestion, buzz, submitAnswer, nextQuestion, finishGame, resetGame, generateQuestions, addQuestion }
  };
} 