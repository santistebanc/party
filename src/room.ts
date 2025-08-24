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
  lastResult?: { userId: string; correct: boolean; delta: number; answer?: string };
  perQuestion?: { answered: boolean; result?: { userId: string; correct: boolean; delta: number; answer?: string } }[];
  currentQuestionAnsweredBy?: Set<string>; // userIds who have already answered current question
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
    | "admin-set-upcoming"
    | "admin-set-bank"
    | "admin-repeat-question"
    | "admin-state"
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
    // Also send consolidated admin state
    await this.sendAdminState(conn);
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
        case "admin-set-upcoming":
          await this.handleSetUpcoming(parsedMessage.data);
          break;
        case "admin-set-bank":
          await this.handleSetBank(parsedMessage.data);
          break;
        case "admin-repeat-question":
          await this.handleRepeatQuestion(parsedMessage.data);
          break;
        case "admin-set-upcoming":
          await this.handleSetUpcoming(parsedMessage.data);
          break;
        case "admin-set-bank":
          await this.handleSetBank(parsedMessage.data);
          break;
        case "admin-repeat-question":
          await this.handleRepeatQuestion(parsedMessage.data);
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
    // Back-compat: store as upcoming list used at game start
    await this.handleSetUpcoming({ questions: data.questions });
  }

  private async handleSetUpcoming(data: { questions: Question[] }) {
    const normalized = (data.questions || []).map(q => ({
      id: q.id || crypto.randomUUID(),
      text: q.text,
      answer: q.answer,
      points: Math.max(1, Math.min(100, Number(q.points) || 1)),
    }));
    await this.room.storage.put("upcoming-questions", normalized);
    await this.broadcastAdminState();
  }

  private async handleSetBank(data: { questions: Question[] }) {
    const normalized = (data.questions || []).map(q => ({
      id: q.id || crypto.randomUUID(),
      text: q.text,
      answer: q.answer,
      points: Math.max(1, Math.min(100, Number(q.points) || 1)),
    }));
    await this.room.storage.put("bank-questions", normalized);
    await this.broadcastAdminState();
  }

  private async handleRepeatQuestion(data: { question: Question }) {
    const list = (await this.room.storage.get<Question[]>("upcoming-questions")) || [];
    const q = data.question;
    list.push({ id: q.id || crypto.randomUUID(), text: q.text, answer: q.answer, points: Math.max(1, Math.min(100, Number(q.points) || 1)) });
    await this.room.storage.put("upcoming-questions", list);
    await this.broadcastAdminState();
  }

  private async handleStartGame(sender: Party.Connection) {
    if (!this.game) {
      this.game = {
        status: "idle",
        questions: [],
        currentIndex: -1,
        buzzQueue: [],
        scores: {},
        perQuestion: [],
      };
    }
    // Freeze snapshot from upcoming list (fallback to prep-questions if needed)
    try {
      const upcoming = await this.room.storage.get<Question[]>("upcoming-questions");
      if (upcoming && upcoming.length > 0) {
        this.game.questions = upcoming.map(q => ({ id: q.id || crypto.randomUUID(), text: q.text, answer: q.answer, points: Math.max(1, Math.min(100, Number(q.points) || 1)) }));
      } else {
        const prep = await this.room.storage.get<Question[]>("prep-questions");
        if (prep && prep.length > 0) {
          this.game.questions = prep.map(q => ({ id: q.id || crypto.randomUUID(), text: q.text, answer: q.answer, points: Math.max(1, Math.min(100, Number(q.points) || 1)) }));
        }
      }
    } catch {}
    this.game.status = "running";
    this.game.currentIndex = 0;
    this.game.buzzQueue = [];
    this.game.currentResponder = undefined;
    this.game.lastResult = undefined;
    this.game.perQuestion = (this.game.questions || []).map(() => ({ answered: false }));
    this.game.currentQuestionAnsweredBy = new Set();
    this.broadcastGame();
    // Remove the now-current question from upcoming playlist immediately
    try {
      const current = this.game.questions[this.game.currentIndex];
      if (current) {
        await this.removeQuestionFromUpcomingById(current.id);
      }
    } catch {}
    await this.broadcastAdminState();
  }

  private async handleBuzz(sender: Party.Connection) {
    if (!this.game || this.game.status !== "running") return;
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    if (!player) return;
    const userId = player.userId;
    
    // Prevent players who have already answered from buzzing again
    if (this.game.currentQuestionAnsweredBy?.has(userId)) return;
    
    // allow everyone to buzz until currentResponder answers
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
    
    // Check if this player has already answered the current question
    if (this.game.currentQuestionAnsweredBy?.has(userId)) return; // already answered

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
    this.game.lastResult = { userId, correct: isCorrect, delta, answer: (data.text || '').toString() };
    
    // Mark this player as having answered the current question
    if (!this.game.currentQuestionAnsweredBy) {
      this.game.currentQuestionAnsweredBy = new Set();
    }
    this.game.currentQuestionAnsweredBy.add(userId);

    if (isCorrect) {
      // lock until next question
      this.game.status = "await-next";
      this.game.currentResponder = undefined;
      this.game.buzzQueue = [];
      if (this.game.perQuestion && this.game.currentIndex >= 0) {
        this.game.perQuestion[this.game.currentIndex] = { answered: true, result: this.game.lastResult };
      }
      // Remove the completed question from upcoming list
      await this.removeCompletedQuestionFromUpcoming();
    } else {
      // pop to next responder
      const nextIndex = position < this.game.buzzQueue.length ? position : -1;
      if (nextIndex > 0) {
        this.game.currentResponder = this.game.buzzQueue[nextIndex - 1];
      } else {
        this.game.status = "await-next";
        this.game.currentResponder = undefined;
        this.game.buzzQueue = [];
        if (this.game.perQuestion && this.game.currentIndex >= 0) {
          this.game.perQuestion[this.game.currentIndex] = { answered: true, result: this.game.lastResult };
        }
        // Remove the completed question from upcoming list
        await this.removeCompletedQuestionFromUpcoming();
      }
    }
    this.broadcastGame();
    await this.broadcastAdminState();
  }

  private async handleNextQuestion(sender: Party.Connection) {
    if (!this.game) return;
    if (this.game.currentIndex + 1 < this.game.questions.length) {
      this.game.currentIndex += 1;
      this.game.status = "running";
      this.game.buzzQueue = [];
      this.game.currentResponder = undefined;
      this.game.lastResult = undefined;
      this.game.currentQuestionAnsweredBy = new Set();
      // Remove the new current question from upcoming playlist as it starts
      const current = this.game.questions[this.game.currentIndex];
      if (current) {
        await this.removeQuestionFromUpcomingById(current.id);
      }
    } else {
      this.game.status = "finished";
    }
    this.broadcastGame();
    await this.broadcastAdminState();
  }

  private async handleFinishGame(sender: Party.Connection) {
    if (!this.game) return;
    this.game.status = "finished";
    this.broadcastGame();
    await this.broadcastAdminState();
  }

  private async handleResetGame(sender: Party.Connection) {
    if (!this.game) return;
    // Repopulate upcoming playlist with all game questions
    const allQuestions = (this.game.questions || []).map(q => ({ id: q.id || crypto.randomUUID(), text: q.text, answer: q.answer, points: Math.max(1, Math.min(100, Number(q.points) || 1)) }));
    await this.room.storage.put("upcoming-questions", allQuestions);

    // Clear history and reset game state
    this.game.status = "idle";
    this.game.currentIndex = -1;
    this.game.buzzQueue = [];
    this.game.currentResponder = undefined;
    this.game.lastResult = undefined;
    this.game.scores = {};
    this.game.perQuestion = (this.game.questions || []).map(() => ({ answered: false }));
    this.game.currentQuestionAnsweredBy = new Set();
    this.broadcastGame();
    await this.broadcastAdminState();
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

  private async sendAdminState(conn?: Party.Connection) {
    const upcoming = (await this.room.storage.get<Question[]>("upcoming-questions")) || [];
    const bank = (await this.room.storage.get<Question[]>("bank-questions")) || [];
    let history: Array<{ index: number; answered: boolean; result?: any; question?: Question }> = [];
    if (this.game) {
      const maxIndex = this.game.status === "idle" ? -1 : (this.game.status === "finished" ? (this.game.questions?.length || 0) - 1 : this.game.currentIndex);
      const per = this.game.perQuestion || [];
      history = (this.game.questions || []).map((q, idx) => ({
        index: idx,
        answered: !!per[idx]?.answered,
        result: per[idx]?.result,
        question: q,
      })).filter(entry => entry.index <= maxIndex && !!entry.question);
    }
    const payload = { upcoming, bank, history };
    const msg = JSON.stringify({ type: "admin-state", data: payload });
    if (conn) {
      conn.send(msg);
    } else {
      this.room.broadcast(msg);
    }
  }

  private async broadcastAdminState() {
    await this.sendAdminState();
  }

  private async removeCompletedQuestionFromUpcoming() {
    if (!this.game || this.game.currentIndex < 0) return;
    
    const upcoming = (await this.room.storage.get<Question[]>("upcoming-questions")) || [];
    const currentQuestion = this.game.questions[this.game.currentIndex];
    
    if (currentQuestion) {
      // Remove the completed question from upcoming list
      const updatedUpcoming = upcoming.filter(q => q.id !== currentQuestion.id);
      await this.room.storage.put("upcoming-questions", updatedUpcoming);
    }
  }

  private async removeQuestionFromUpcomingById(questionId: string) {
    const upcoming = (await this.room.storage.get<Question[]>("upcoming-questions")) || [];
    const updated = upcoming.filter(q => q.id !== questionId);
    await this.room.storage.put("upcoming-questions", updated);
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