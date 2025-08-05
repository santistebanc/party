import type * as Party from "partykit/server";

interface RoomInfo {
  id: string;
  createdAt: number;
}

interface LobbyMessage {
  type: "create-room" | "join-room" | "list-rooms" | "room-created" | "room-joined" | "rooms-list" | "clear-storage";
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
          await this.handleCreateRoom(sender);
          break;
        case "join-room":
          await this.handleJoinRoom(parsedMessage.data, sender);
          break;
        case "list-rooms":
          await this.sendRoomsList(sender);
          break;
        case "clear-storage":
          await this.handleClearStorage(sender);
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  }

  private async handleCreateRoom(sender: Party.Connection) {
    const roomId = this.generateRoomId();
    const roomInfo: RoomInfo = {
      id: roomId,
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
      data: "Storage cleared successfully"
    }));

    // Broadcast updated rooms list to all connections
    await this.broadcastRoomsList();
  }

  private async sendRoomsList(conn: Party.Connection) {
    const rooms = await this.getAllRooms();
    conn.send(JSON.stringify({
      type: "rooms-list",
      data: rooms
    }));
  }

  private async broadcastRoomsList() {
    const rooms = await this.getAllRooms();
    this.room.broadcast(JSON.stringify({
      type: "rooms-list",
      data: rooms
    }));
  }

  private async getAllRooms(): Promise<RoomInfo[]> {
    const keys = await this.room.storage.list();
    const rooms: RoomInfo[] = [];
    
    for (const [key] of keys) {
      if (key.startsWith('room:')) {
        const roomInfo = await this.room.storage.get<RoomInfo>(key);
        if (roomInfo) {
          rooms.push(roomInfo);
        }
      }
    }
    
    return rooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  private generateRoomId(): string {
    // Generate a 6-character alphanumeric ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

LobbyServer satisfies Party.Worker; 