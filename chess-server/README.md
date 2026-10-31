# Chess server

The game server for Panchayat's online chess. It is the backend of
[DevChess](https://github.com/DevdharManpuria/devchess) by Devdhar Manpuria
(MIT licence, see `LICENSE`), copied without changes.

It pairs the first two players who ask for a match (the first plays white),
checks every move with chess.js before passing it to the opponent, and ends the
game on checkmate, a draw, or when a player disconnects.

## Run it

Needs Node.js 20 or newer.

```bash
cd chess-server
npm install
PORT=8090 npm run dev      # development, restarts on changes
# or
npm run build && PORT=8090 npm start
```

Port 8090 is what the app expects by default (8080 is usually the Spring Boot
backend). The app reads the address from `NEXT_PUBLIC_CHESS_WS_URL`
(default `ws://localhost:8090`).

## Production

- Host it anywhere that runs Node and allows WebSockets (Render, Railway, a VPS).
- If the app is served over https, the chess server must be reachable over
  `wss://`, and `NEXT_PUBLIC_CHESS_WS_URL` must be that `wss://` address
  (it is baked in at build time).
- Games live in memory, so a restart ends games in progress.
- It has no login: players are anonymous and the server doesn't know Panchayat
  users. That's why chess wins don't give EXP.
