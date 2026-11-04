import type { WebSocket } from "ws";
import { Chess } from "chess.js";
import { z } from "zod";

/**
 * Chess rooms: a table anyone can watch.
 *  - Two people play (white and black); everyone else watches.
 *  - Watchers can join the queue and see their number ("You're #2").
 *  - When a game ends the winner stays on (as white) and the next in the queue
 *    plays black; the loser goes to the back of the queue. Draw: black goes back.
 *  - A room has a 6-character code to share; open rooms are listed for everyone.
 * Moves are checked with chess.js here; clients only show what the server sends.
 */

const NameSchema = z.string().trim().min(1).max(40);
const MoveSchema = z.object({
  from: z.string().regex(/^[a-h][1-8]$/),
  to: z.string().regex(/^[a-h][1-8]$/),
  promotion: z.enum(["q", "r", "b", "n"]).optional(),
});
export const RoomMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello"), name: NameSchema, avatar: z.string().url().max(400).optional() }),
  z.object({ type: z.literal("list_rooms") }),
  z.object({ type: z.literal("create_room"), title: z.string().trim().max(40).optional() }),
  z.object({ type: z.literal("join_room"), code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,8}$/) }),
  z.object({ type: z.literal("leave_room") }),
  z.object({ type: z.literal("queue_join") }),
  z.object({ type: z.literal("queue_leave") }),
  z.object({ type: z.literal("room_move"), move: MoveSchema }),
  z.object({ type: z.literal("resign") }),
  z.object({ type: z.literal("react"), emoji: z.string().max(8) }),
]);
export type RoomMessage = z.infer<typeof RoomMessageSchema>;

type Member = { ws: WebSocket; name: string; avatar: string | undefined };
type Result = { winner: "white" | "black" | null; reason: string } | null;

class Room {
  code: string;
  title: string;
  members = new Set<Member>();
  white: Member | null = null;
  black: Member | null = null;
  queue: Member[] = [];
  board = new Chess();
  status: "waiting" | "playing" | "over" = "waiting";
  result: Result = null;
  lastMove: { from: string; to: string } | null = null;
  next: ReturnType<typeof setTimeout> | null = null;
  wins = new Map<string, number>();
  createdAt = Date.now();

  constructor(code: string, title: string) {
    this.code = code;
    this.title = title;
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NEXT_GAME_MS = 5000;
const MAX_ROOMS = 500;

export class ChessRooms {
  private rooms = new Map<string, Room>();
  private who = new Map<WebSocket, Member>();
  private roomOf = new Map<WebSocket, Room>();
  private lobby = new Set<WebSocket>();

  /** true when the message was a room message (handled here). */
  handle(ws: WebSocket, raw: unknown): boolean {
    const r = RoomMessageSchema.safeParse(raw);
    if (!r.success) return false;
    const m = r.data;
    switch (m.type) {
      case "hello": {
        const me = this.member(ws);
        me.name = m.name;
        me.avatar = m.avatar;
        const room = this.roomOf.get(ws);
        if (room) this.broadcast(room);
        return true;
      }
      case "list_rooms":
        this.lobby.add(ws);
        this.sendRooms(ws);
        return true;
      case "create_room": {
        if (this.rooms.size >= MAX_ROOMS) return this.error(ws, "Too many chess rooms are open. Try again soon.");
        this.leave(ws);
        const room = new Room(this.newCode(), m.title || `${this.member(ws).name}'s chess room`);
        this.rooms.set(room.code, room);
        this.enter(ws, room);
        this.joinQueue(ws, room);
        return true;
      }
      case "join_room": {
        const room = this.rooms.get(m.code);
        if (!room) return this.error(ws, "No chess room with that code.");
        if (this.roomOf.get(ws) !== room) {
          this.leave(ws);
          this.enter(ws, room);
        }
        this.broadcast(room);
        return true;
      }
      case "leave_room":
        this.leave(ws);
        return true;
      case "queue_join": {
        const room = this.roomOf.get(ws);
        if (room) this.joinQueue(ws, room);
        return true;
      }
      case "queue_leave": {
        const room = this.roomOf.get(ws);
        if (!room) return true;
        room.queue = room.queue.filter((q) => q.ws !== ws);
        this.broadcast(room);
        return true;
      }
      case "room_move": {
        const room = this.roomOf.get(ws);
        if (!room || room.status !== "playing") return true;
        const mover = room.board.turn() === "w" ? room.white : room.black;
        if (!mover || mover.ws !== ws) return true;
        const { from, to, promotion } = m.move;
        try {
          room.board.move(promotion ? { from, to, promotion } : { from, to });
        } catch {
          return true; // illegal: ignore
        }
        room.lastMove = { from, to };
        if (room.board.isGameOver()) this.finish(room, this.resultOf(room.board));
        else this.broadcast(room);
        return true;
      }
      case "resign": {
        const room = this.roomOf.get(ws);
        if (!room || room.status !== "playing") return true;
        if (room.white?.ws === ws) this.finish(room, { winner: "black", reason: "resign" });
        else if (room.black?.ws === ws) this.finish(room, { winner: "white", reason: "resign" });
        return true;
      }
      case "react": {
        const room = this.roomOf.get(ws);
        if (!room) return true;
        const me = this.member(ws);
        const msg = JSON.stringify({ type: "room_react", payload: { name: me.name, emoji: m.emoji } });
        for (const x of room.members) x.ws.send(msg);
        return true;
      }
    }
  }

  /** The socket closed. */
  drop(ws: WebSocket) {
    this.leave(ws);
    this.lobby.delete(ws);
    this.who.delete(ws);
  }

  private member(ws: WebSocket): Member {
    let me = this.who.get(ws);
    if (!me) {
      me = { ws, name: "Player", avatar: undefined };
      this.who.set(ws, me);
    }
    return me;
  }

  private newCode() {
    for (;;) {
      let c = "";
      for (let i = 0; i < 6; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      if (!this.rooms.has(c)) return c;
    }
  }

  private enter(ws: WebSocket, room: Room) {
    room.members.add(this.member(ws));
    this.roomOf.set(ws, room);
    this.lobby.delete(ws);
  }

  private joinQueue(ws: WebSocket, room: Room) {
    const me = this.member(ws);
    if (room.white === me || room.black === me || room.queue.includes(me)) return this.broadcast(room);
    room.queue.push(me);
    this.fill(room);
    this.broadcast(room);
  }

  /** Seat people from the queue and start a game when both seats are taken. */
  private fill(room: Room) {
    if (room.status === "playing" || room.next) return;
    if (!room.white && room.queue.length) room.white = room.queue.shift()!;
    if (!room.black && room.queue.length) room.black = room.queue.shift()!;
    if (room.white && room.black) {
      room.board = new Chess();
      room.lastMove = null;
      room.result = null;
      room.status = "playing";
    } else {
      room.status = "waiting";
    }
  }

  private finish(room: Room, result: Result) {
    room.status = "over";
    room.result = result;
    if (result?.winner) {
      const w = result.winner === "white" ? room.white : room.black;
      if (w) room.wins.set(w.name, (room.wins.get(w.name) ?? 0) + 1);
    }
    this.broadcast(room);
    if (room.next) clearTimeout(room.next);
    room.next = setTimeout(() => {
      room.next = null;
      // Winner stays on as white; the loser (or black, on a draw) goes to the back of the queue
      const white = room.white;
      const black = room.black;
      const winner = result?.winner === "black" ? black : white;
      const loser = winner === white ? black : white;
      room.white = winner && room.members.has(winner) ? winner : null;
      room.black = null;
      if (loser && room.members.has(loser)) room.queue.push(loser);
      this.fill(room);
      this.broadcast(room);
    }, NEXT_GAME_MS);
  }

  private leave(ws: WebSocket) {
    const room = this.roomOf.get(ws);
    if (!room) return;
    const me = this.member(ws);
    this.roomOf.delete(ws);
    room.members.delete(me);
    room.queue = room.queue.filter((q) => q !== me);
    if (room.status === "playing" && (room.white === me || room.black === me)) {
      this.finish(room, { winner: room.white === me ? "black" : "white", reason: "opponent_left" });
    }
    if (room.white === me) room.white = null;
    if (room.black === me) room.black = null;
    if (room.members.size === 0) {
      if (room.next) clearTimeout(room.next);
      this.rooms.delete(room.code);
      this.pushLobby();
      return;
    }
    if (room.status !== "over") this.fill(room);
    this.broadcast(room);
  }

  private resultOf(b: Chess): Result {
    if (b.isCheckmate()) return { winner: b.turn() === "w" ? "black" : "white", reason: "checkmate" };
    if (b.isStalemate()) return { winner: null, reason: "stalemate" };
    if (b.isThreefoldRepetition()) return { winner: null, reason: "repetition" };
    if (b.isInsufficientMaterial()) return { winner: null, reason: "insufficient_material" };
    return { winner: null, reason: "fifty_moves" };
  }

  private seat(m: Member | null) {
    return m ? { name: m.name, avatar: m.avatar ?? null } : null;
  }

  private broadcast(room: Room) {
    const base = {
      code: room.code,
      title: room.title,
      status: room.status,
      fen: room.board.fen(),
      lastMove: room.lastMove,
      moveNumber: room.board.moveNumber(),
      turn: room.board.turn() === "w" ? "white" : "black",
      check: room.board.inCheck(),
      white: this.seat(room.white),
      black: this.seat(room.black),
      queue: room.queue.map((q) => ({ name: q.name, avatar: q.avatar ?? null })),
      watchers: room.members.size,
      result: room.result,
      wins: Object.fromEntries(room.wins),
    };
    for (const m of room.members) {
      const role = room.white === m ? "white" : room.black === m ? "black" : room.queue.includes(m) ? "queue" : "watcher";
      const position = role === "queue" ? room.queue.indexOf(m) + 1 : null;
      m.ws.send(JSON.stringify({ type: "room_state", payload: { ...base, you: { role, position } } }));
    }
    this.pushLobby();
  }

  private listing() {
    return [...this.rooms.values()]
      .sort((a, b) => (a.status === "playing" ? 0 : 1) - (b.status === "playing" ? 0 : 1) || b.createdAt - a.createdAt)
      .slice(0, 30)
      .map((r) => ({ code: r.code, title: r.title, status: r.status, white: this.seat(r.white), black: this.seat(r.black), queue: r.queue.length, watchers: r.members.size }));
  }

  private sendRooms(ws: WebSocket) {
    ws.send(JSON.stringify({ type: "rooms", payload: this.listing() }));
  }

  private pushLobby() {
    if (!this.lobby.size) return;
    const msg = JSON.stringify({ type: "rooms", payload: this.listing() });
    for (const ws of this.lobby) ws.send(msg);
  }

  private error(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({ type: "room_error", payload: { message } }));
    return true;
  }
}
