import type * as Party from "partykit/server";

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface Question {
  id: string;
  text: string;
  answer: string;
  points: number;
}

type GameStatus = "idle" | "running" | "await-next" | "finished";

interface GameState {
  status: GameStatus;
  questions: Question[];
  currentIndex: number;
  buzzQueue: string[]; // userIds in order of buzz
  currentResponder?: string; // userId
  scores: Record<string, number>; // userId -> score
  lastResult?: { userId: string; correct: boolean; delta: number };
}

interface RoomMessage {
  type:
    | "join"
    | "leave"
    | "chat"
    | "player-joined"
    | "player-left"
    | "room-info"
    | "admin-set-questions"
    | "start-game"
    | "buzz"
    | "submit-answer"
    | "next-question"
    | "finish-game"
    | "reset-game";
  data?: any;
}

export default class RoomServer implements Party.Server {
  game: GameState | undefined;
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Room ${this.room.id}: ${conn.id} connected`);
    // Lazily load game from storage and send to this connection
    await this.ensureGameLoaded();
    // Send room info to the new connection
    await this.sendRoomInfo(conn);
    if (this.game) {
      conn.send(JSON.stringify({ type: "game-update", data: this.game }));
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      await this.ensureGameLoaded();
      const parsedMessage: RoomMessage = JSON.parse(message);
      
      switch (parsedMessage.type) {
        case "join":
          await this.handleJoin(parsedMessage.data, sender);
          break;
        case "leave":
          await this.handleLeave(sender);
          break;
        case "chat":
          await this.handleChat(parsedMessage.data, sender);
          break;
        case "admin-set-questions":
          await this.handleSetQuestions(parsedMessage.data, sender);
          break;
        case "start-game":
          await this.handleStartGame(sender);
          break;
        case "buzz":
          await this.handleBuzz(sender);
          break;
        case "submit-answer":
          await this.handleSubmitAnswer(parsedMessage.data, sender);
          break;
        case "next-question":
          await this.handleNextQuestion(sender);
          break;
        case "finish-game":
          await this.handleFinishGame(sender);
          break;
        case "reset-game":
          await this.handleResetGame(sender);
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  async onClose(conn: Party.Connection) {
    await this.handleLeave(conn);
  }

  private async handleJoin(data: { name: string; userId?: string }, sender: Party.Connection) {
    const userId = data.userId || sender.id;
    
    // Check if this user is already in the room
    const existingPlayers = await this.getAllPlayers();
    const existingPlayer = existingPlayers.find(p => p.userId === userId);
    
    if (existingPlayer) {
      // User is already in the room, just update the connection
      console.log(`User ${existingPlayer.name} (${userId}) already in room, updating connection`);
      
      // Update the existing player's connection ID
      await this.room.storage.delete(`player:${existingPlayer.id}`);
      existingPlayer.id = sender.id; // Update to new connection ID
      await this.room.storage.put(`player:${sender.id}`, existingPlayer);
      
      // Notify the sender that they joined (but don't broadcast to others since they're already there)
      sender.send(JSON.stringify({
        type: "player-joined",
        data: { player: existingPlayer, roomId: this.room.id }
      }));
    } else {
      // New player joining
      const player: Player = {
        id: sender.id,
        name: data.name,
        userId: userId,
        joinedAt: Date.now()
      };

      // Store player in PartyKit storage
      await this.room.storage.put(`player:${sender.id}`, player);
      
      // Notify the sender that they joined
      sender.send(JSON.stringify({
        type: "player-joined",
        data: { player, roomId: this.room.id }
      }));

      // Broadcast to all other players
      this.room.broadcast(JSON.stringify({
        type: "player-joined",
        data: { player, roomId: this.room.id }
      }), [sender.id]);
    }

    // Send updated room info to all players
    await this.broadcastRoomInfo();
  }

  private async handleLeave(sender: Party.Connection) {
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    
    if (player) {
      // Remove player from storage
      await this.room.storage.delete(`player:${sender.id}`);
      
      // Check if this user has other connections in the room
      const allPlayers = await this.getAllPlayers();
      const userConnections = allPlayers.filter(p => p.userId === player.userId);
      
      // Only broadcast player-left if this was their last connection
      if (userConnections.length === 0) {
        this.room.broadcast(JSON.stringify({
          type: "player-left",
          data: { player, roomId: this.room.id }
        }));
      }
    }

    // Send updated room info to all remaining players
    await this.broadcastRoomInfo();
  }

  private async handleChat(data: { message: string }, sender: Party.Connection) {
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    
    if (player) {
      const chatMessage = {
        type: "chat",
        data: {
          message: data.message,
          player: player,
          timestamp: Date.now()
        }
      };
      
      this.room.broadcast(JSON.stringify(chatMessage));
    }
  }

  // ---------- Game handlers ----------
  private async ensureGameLoaded() {
    if (!this.game) {
      const stored = await this.room.storage.get<GameState>("game");
      if (stored) {
        this.game = stored;
      }
    }
  }

  private async handleSetQuestions(data: { questions: Question[] }, sender: Party.Connection) {
    if (!this.game || this.game.status === "idle" || this.game.status === "finished") {
      this.game = {
        status: "idle",
        questions: (data.questions || []).map(q => ({
          id: q.id || crypto.randomUUID(),
          text: q.text,
          answer: q.answer,
          points: Math.max(1, Math.min(100, Number(q.points) || 1)),
        })),
        currentIndex: -1,
        buzzQueue: [],
        scores: {},
      };
      this.broadcastGame();
    } else {
      // While running, allow updating future questions only
      this.game.questions = (data.questions || []).map(q => ({
        id: q.id || crypto.randomUUID(),
        text: q.text,
        answer: q.answer,
        points: Math.max(1, Math.min(100, Number(q.points) || 1)),
      }));
      this.broadcastGame();
    }
  }

  private async handleStartGame(sender: Party.Connection) {
    if (!this.game) {
      this.game = {
        status: "idle",
        questions: [],
        currentIndex: -1,
        buzzQueue: [],
        scores: {},
      };
    }
    this.game.status = "running";
    this.game.currentIndex = 0;
    this.game.buzzQueue = [];
    this.game.currentResponder = undefined;
    this.game.lastResult = undefined;
    this.broadcastGame();
  }

  private async handleBuzz(sender: Party.Connection) {
    if (!this.game || this.game.status !== "running") return;
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    if (!player) return;
    const userId = player.userId;
    if (!this.game.buzzQueue.includes(userId)) {
      this.game.buzzQueue.push(userId);
      if (!this.game.currentResponder) {
        this.game.currentResponder = userId;
      }
      this.broadcastGame();
    }
  }

  private async handleSubmitAnswer(data: { text: string }, sender: Party.Connection) {
    if (!this.game || this.game.status !== "running") return;
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    if (!player) return;
    const userId = player.userId;
    if (this.game.currentResponder !== userId) return; // not your turn

    const q = this.game.questions[this.game.currentIndex];
    if (!q) return;
    const isCorrect = (data.text || "").trim().toLowerCase() === q.answer.trim().toLowerCase();
    const position = this.game.buzzQueue.indexOf(userId) + 1; // 1-based
    const base = q.points;
    let delta = 0;
    if (isCorrect) {
      delta = base;
    } else {
      const penalty = Math.max(1, Math.round(base / Math.pow(2, Math.max(0, position - 1))));
      delta = -penalty;
    }
    this.game.scores[userId] = (this.game.scores[userId] || 0) + delta;
    this.game.lastResult = { userId, correct: isCorrect, delta };

    if (isCorrect) {
      // lock until next question
      this.game.status = "await-next";
      this.game.currentResponder = undefined;
      this.game.buzzQueue = [];
    } else {
      // pop to next responder
      const nextIndex = position < this.game.buzzQueue.length ? position : -1;
      if (nextIndex > 0) {
        this.game.currentResponder = this.game.buzzQueue[nextIndex - 1];
      } else {
        this.game.status = "await-next";
        this.game.currentResponder = undefined;
        this.game.buzzQueue = [];
      }
    }
    this.broadcastGame();
  }

  private async handleNextQuestion(sender: Party.Connection) {
    if (!this.game) return;
    if (this.game.currentIndex + 1 < this.game.questions.length) {
      this.game.currentIndex += 1;
      this.game.status = "running";
      this.game.buzzQueue = [];
      this.game.currentResponder = undefined;
      this.game.lastResult = undefined;
    } else {
      this.game.status = "finished";
    }
    this.broadcastGame();
  }

  private async handleFinishGame(sender: Party.Connection) {
    if (!this.game) return;
    this.game.status = "finished";
    this.broadcastGame();
  }

  private async handleResetGame(sender: Party.Connection) {
    if (!this.game) return;
    this.game.status = "idle";
    this.game.currentIndex = -1;
    this.game.buzzQueue = [];
    this.game.currentResponder = undefined;
    this.game.lastResult = undefined;
    this.game.scores = {};
    this.broadcastGame();
  }

  private broadcastGame() {
    if (!this.game) return;
    // Persist to storage and broadcast
    this.room.storage.put("game", this.game).catch(() => {});
    this.room.broadcast(JSON.stringify({ type: "game-update", data: this.game }));
  }

  private async sendRoomInfo(conn: Party.Connection) {
    const players = await this.getAllPlayers();
    
    conn.send(JSON.stringify({
      type: "room-info",
      data: {
        roomId: this.room.id,
        players: players
      }
    }));
  }

  private async broadcastRoomInfo() {
    const players = await this.getAllPlayers();
    
    this.room.broadcast(JSON.stringify({
      type: "room-info",
      data: {
        roomId: this.room.id,
        players: players
      }
    }));
  }

  private async getAllPlayers(): Promise<Player[]> {
    const keys = await this.room.storage.list();
    const players: Player[] = [];
    
    for (const [key] of keys) {
      if (key.startsWith('player:')) {
        const player = await this.room.storage.get<Player>(key);
        if (player) {
          players.push(player);
        }
      }
    }
    
    return players.sort((a, b) => a.joinedAt - b.joinedAt);
  }
}

RoomServer satisfies Party.Worker; 