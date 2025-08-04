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
  private roomName: string;

  constructor(readonly room: Party.Room) {
    this.roomName = this.room.id;
  }

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Room ${this.roomName}: ${conn.id} connected`);
    
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
        data: { player: existingPlayer, roomName: this.roomName }
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
        data: { player, roomName: this.roomName }
      }));

      // Broadcast to all other players
      this.room.broadcast(JSON.stringify({
        type: "player-joined",
        data: { player, roomName: this.roomName }
      }), [sender.id]);
    }

    // Send updated room info to all players
    await this.broadcastRoomInfo();
    
    // Update player count in lobby
    await this.updateLobbyPlayerCount();
  }

  private async handleLeave(sender: Party.Connection) {
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    
    if (player) {
      // Check if this user has another connection in the room
      const allPlayers = await this.getAllPlayers();
      const otherConnections = allPlayers.filter(p => 
        p.userId === player.userId && p.id !== sender.id
      );
      
      if (otherConnections.length > 0) {
        // User has another connection, just remove this one
        console.log(`User ${player.name} (${player.userId}) has other connections, removing only this one`);
        await this.room.storage.delete(`player:${sender.id}`);
      } else {
        // This is the user's last connection, remove them completely
        console.log(`User ${player.name} (${player.userId}) leaving room completely`);
        await this.room.storage.delete(`player:${sender.id}`);
        
        // Broadcast to all other players
        this.room.broadcast(JSON.stringify({
          type: "player-left",
          data: { player, roomName: this.roomName }
        }), [sender.id]);
      }

      // Send updated room info to all players
      await this.broadcastRoomInfo();
      
      // Update player count in lobby
      await this.updateLobbyPlayerCount();
    }
  }

  private async handleChat(data: { message: string }, sender: Party.Connection) {
    const player = await this.room.storage.get<Player>(`player:${sender.id}`);
    
    if (player) {
      const chatMessage = {
        player: player.name,
        message: data.message,
        timestamp: Date.now()
      };

      // Broadcast chat message to all players
      this.room.broadcast(JSON.stringify({
        type: "chat",
        data: chatMessage
      }));
    }
  }

  private async sendRoomInfo(conn: Party.Connection) {
    const players = await this.getAllPlayers();
    conn.send(JSON.stringify({
      type: "room-info",
      data: {
        roomName: this.roomName,
        players,
        playerCount: players.length
      }
    }));
  }

  private async broadcastRoomInfo() {
    const players = await this.getAllPlayers();
    this.room.broadcast(JSON.stringify({
      type: "room-info",
      data: {
        roomName: this.roomName,
        players,
        playerCount: players.length
      }
    }));
  }

  private async getAllPlayers(): Promise<Player[]> {
    const players: Player[] = [];
    const keys = await this.room.storage.list();
    
    for (const [key] of keys) {
      if (key.startsWith('player:')) {
        const player = await this.room.storage.get<Player>(key);
        if (player) {
          players.push(player);
        }
      }
    }
    
    return players.sort((a, b) => a.joinedAt - b.joinedAt); // Sort by join time (oldest first)
  }

  private async updateLobbyPlayerCount() {
    const players = await this.getAllPlayers();
    const roomId = this.roomName.replace('room-', '');
    
    // For now, we'll just log the player count update
    // In a real implementation, you might want to use PartyKit's internal messaging
    // or a different approach to communicate between rooms
    console.log(`Room ${this.roomName}: Player count updated to ${players.length}`);
  }
}

RoomServer satisfies Party.Worker; 