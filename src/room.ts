import type * as Party from "partykit/server";

interface Player {
  id: string;
  name: string;
  userId: string;
  joinedAt: number;
}

interface RoomMessage {
  type: "join" | "leave" | "chat" | "player-joined" | "player-left" | "room-info";
  data?: any;
}

export default class RoomServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Room ${this.room.id}: ${conn.id} connected`);
    
    // Send room info to the new connection
    await this.sendRoomInfo(conn);
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
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