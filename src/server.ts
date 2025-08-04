import type * as Party from "partykit/server";
import LobbyServer from "./lobby";
import RoomServer from "./room";

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Route to appropriate server based on room name
    const roomName = this.room.id;
    
    if (roomName === "lobby") {
      const lobbyServer = new LobbyServer(this.room);
      await lobbyServer.onConnect(conn, ctx);
    } else if (roomName.startsWith("room-")) {
      const roomServer = new RoomServer(this.room);
      await roomServer.onConnect(conn, ctx);
    } else {
      // Default behavior for other rooms
      console.log(`Connected to room: ${roomName}`);
      conn.send("hello from server");
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    const roomName = this.room.id;
    
    if (roomName === "lobby") {
      const lobbyServer = new LobbyServer(this.room);
      await lobbyServer.onMessage(message, sender);
    } else if (roomName.startsWith("room-")) {
      const roomServer = new RoomServer(this.room);
      await roomServer.onMessage(message, sender);
    } else {
      // Default behavior for other rooms
      console.log(`connection ${sender.id} sent message: ${message}`);
      this.room.broadcast(
        `${sender.id}: ${message}`,
        [sender.id]
      );
    }
  }

  async onClose(conn: Party.Connection) {
    const roomName = this.room.id;
    
    if (roomName.startsWith("room-")) {
      const roomServer = new RoomServer(this.room);
      await roomServer.onClose(conn);
    }
  }
}

Server satisfies Party.Worker;
