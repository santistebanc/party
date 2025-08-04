import type * as Party from "partykit/server";

interface RoomInfo {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  createdAt: number;
}

interface LobbyMessage {
  type: "create-room" | "join-room" | "list-rooms" | "room-created" | "room-joined" | "rooms-list" | "update-player-count" | "clear-storage";
  data?: any;
}

export default class LobbyServer implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Lobby: ${conn.id} connected`);
    
    // Send current rooms list to the new connection
    await this.sendRoomsList(conn);
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const parsedMessage: LobbyMessage = JSON.parse(message);
      
      switch (parsedMessage.type) {
        case "create-room":
          await this.handleCreateRoom(parsedMessage.data, sender);
          break;
        case "join-room":
          await this.handleJoinRoom(parsedMessage.data, sender);
          break;
        case "list-rooms":
          await this.sendRoomsList(sender);
          break;
        case "update-player-count":
          await this.handleUpdatePlayerCount(parsedMessage.data);
          break;
        case "clear-storage":
          await this.handleClearStorage(sender);
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  async onRequest(request: Party.Request) {
    // Handle HTTP POST requests from rooms
    if (request.method === 'POST') {
      try {
        const body = await request.json() as { type: string; data?: any };
        
        if (body.type === "update-player-count") {
          await this.handleUpdatePlayerCount(body.data);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error("Error handling HTTP request:", error);
        return new Response(JSON.stringify({ error: "Invalid request" }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response("Not found", { status: 404 });
  }

  private async handleCreateRoom(data: { name: string; maxPlayers?: number }, sender: Party.Connection) {
    const roomId = this.generateRoomId();
    const roomInfo: RoomInfo = {
      id: roomId,
      name: data.name,
      playerCount: 0,
      maxPlayers: data.maxPlayers || 4,
      createdAt: Date.now()
    };

    // Store room in PartyKit storage
    await this.room.storage.put(`room:${roomId}`, roomInfo);
    
    // Notify the sender that room was created
    sender.send(JSON.stringify({
      type: "room-created",
      data: roomInfo
    }));

    // Broadcast updated rooms list to all connections
    await this.broadcastRoomsList();
  }

  private async handleJoinRoom(data: { roomId: string }, sender: Party.Connection) {
    const roomInfo = await this.room.storage.get<RoomInfo>(`room:${data.roomId}`);
    
    if (roomInfo) {
      // Notify the sender that they can join the room
      sender.send(JSON.stringify({
        type: "room-joined",
        data: roomInfo
      }));
    } else {
      sender.send(JSON.stringify({
        type: "error",
        data: "Room not found"
      }));
    }
  }

  private async handleUpdatePlayerCount(data: { roomId: string; playerCount: number }) {
    const roomInfo = await this.room.storage.get<RoomInfo>(`room:${data.roomId}`);
    
    if (roomInfo) {
      roomInfo.playerCount = data.playerCount;
      await this.room.storage.put(`room:${data.roomId}`, roomInfo);
      
      // Broadcast updated rooms list to all connections
      await this.broadcastRoomsList();
    }
  }

  private async handleClearStorage(sender: Party.Connection) {
    const keys = await this.room.storage.list();
    
    // Delete all room entries
    for (const [key] of keys) {
      if (key.startsWith('room:')) {
        await this.room.storage.delete(key);
      }
    }
    
    console.log('Storage cleared by', sender.id);
    
    // Notify the sender that storage was cleared
    sender.send(JSON.stringify({
      type: "storage-cleared",
      data: { message: "Storage cleared successfully" }
    }));
    
    // Broadcast updated rooms list to all connections
    await this.broadcastRoomsList();
  }

  private async sendRoomsList(conn: Party.Connection) {
    const roomsList = await this.getAllRooms();
    conn.send(JSON.stringify({
      type: "rooms-list",
      data: roomsList
    }));
  }

  private async broadcastRoomsList() {
    const roomsList = await this.getAllRooms();
    this.room.broadcast(JSON.stringify({
      type: "rooms-list",
      data: roomsList
    }));
  }

  private async getAllRooms(): Promise<RoomInfo[]> {
    const rooms: RoomInfo[] = [];
    const keys = await this.room.storage.list();
    
    for (const [key] of keys) {
      if (key.startsWith('room:')) {
        const roomInfo = await this.room.storage.get<RoomInfo>(key);
        if (roomInfo) {
          rooms.push(roomInfo);
        }
      }
    }
    
    return rooms.sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

LobbyServer satisfies Party.Worker; 