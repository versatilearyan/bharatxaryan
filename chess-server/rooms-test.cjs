// Chess rooms smoke test: create, join, queue numbers, watchers, fool's mate, winner stays, loser to queue.
const WS = require("ws");
const URL = "ws://localhost:8090";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, c, d) => { results.push(!!c); console.log((c ? "PASS " : "FAIL ") + n + (c ? "" : "  -> " + JSON.stringify(d).slice(0, 300))); };

function client(name) {
  return new Promise((resolve) => {
    const ws = new WS(URL);
    const c = { ws, name, state: null, rooms: null, send: (m) => ws.send(JSON.stringify(m)) };
    ws.on("message", (b) => {
      const m = JSON.parse(String(b));
      if (m.type === "room_state") c.state = m.payload;
      if (m.type === "rooms") c.rooms = m.payload;
      if (m.type === "room_error") c.error = m.payload.message;
    });
    ws.on("open", () => { c.send({ type: "hello", name }); resolve(c); });
  });
}

(async () => {
  const a = await client("Asha"), b = await client("Bharat"), c = await client("Chetan"), d = await client("Divya");
  d.send({ type: "list_rooms" });
  a.send({ type: "create_room" });
  await sleep(300);
  const code = a.state && a.state.code;
  check("room created with a code", code && code.length === 6, a.state);
  check("creator is white, waiting", a.state.you.role === "white" && a.state.status === "waiting", a.state);
  check("lobby sees the room", d.rooms && d.rooms.some((r) => r.code === code), d.rooms);
  b.send({ type: "join_room", code });
  await sleep(200);
  check("joiner watches first", b.state.you.role === "watcher", b.state);
  b.send({ type: "queue_join" });
  await sleep(200);
  check("second player gets black and the game starts", b.state.you.role === "black" && b.state.status === "playing", b.state);
  c.send({ type: "join_room", code }); d.send({ type: "join_room", code });
  await sleep(200);
  c.send({ type: "queue_join" });
  await sleep(100);
  d.send({ type: "queue_join" });
  await sleep(200);
  check("queue numbers: Chetan #1, Divya #2", c.state.you.position === 1 && d.state.you.position === 2, [c.state.you, d.state.you]);
  check("watchers count everyone", a.state.watchers === 4, a.state.watchers);
  b.send({ type: "room_move", move: { from: "e7", to: "e5" } });
  await sleep(100);
  check("out-of-turn move ignored", a.state.moveNumber === 1 && a.state.turn === "white", a.state);
  // Fool's mate (black wins): white f3, e5, g4, Qh4#
  a.send({ type: "room_move", move: { from: "f2", to: "f3" } }); await sleep(80);
  b.send({ type: "room_move", move: { from: "e7", to: "e5" } }); await sleep(80);
  a.send({ type: "room_move", move: { from: "g2", to: "g4" } }); await sleep(80);
  b.send({ type: "room_move", move: { from: "d8", to: "h4" } }); await sleep(200);
  check("spectators see the result", c.state.status === "over" && c.state.result.winner === "black", c.state);
  await sleep(5400);
  check("winner stays on as white", b.state.you.role === "white" && b.state.status === "playing", b.state);
  check("next in queue plays black", c.state.you.role === "black", c.state);
  check("loser goes to the back of the queue", a.state.you.role === "queue" && a.state.you.position === 2, a.state.you);
  check("Divya moves up to #1", d.state.you.position === 1, d.state.you);
  b.ws.close();
  await sleep(300);
  check("leaving mid-game: opponent wins", c.state.result && c.state.result.winner === "black" && c.state.result.reason === "opponent_left", c.state);
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  process.exit(0);
})();
