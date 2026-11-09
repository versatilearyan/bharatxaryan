#!/usr/bin/env bash
#
# Runs ON THE SERVER, started by the GitHub Actions workflow. Builds the new app in a separate
# folder (the live site isn't touched while it builds), then switches over and restarts only the
# app's PM2 process. Puts the old folder back if the new one doesn't answer.
#
# Expects: SRC_DIR (mirror of the repo), APP_DIR (live folder), PM2_NAME, APP_PORT, COMMIT.
set -euo pipefail

: "${SRC_DIR:?}" "${APP_DIR:?}" "${PM2_NAME:?}" "${APP_PORT:?}"
STAMP="$(date +%F-%H%M%S)"
STAGE="${APP_DIR}.new"
PREVIOUS="${APP_DIR}.before-${STAMP}"
KEEP=2

say()  { printf '\n==> %s\n' "$*"; }
fail() { printf '\nFAILED: %s\n' "$*" >&2; exit 1; }

exec 9>/tmp/panchayat-app-deploy.lock
flock -n 9 || fail "Another app deploy is running."

say "Checks (commit ${COMMIT:-unknown})"
for tool in rsync node npm pm2 curl; do command -v "$tool" >/dev/null || fail "$tool isn't installed for $(id -un)."; done
[ -f "$SRC_DIR/package.json" ] || fail "$SRC_DIR doesn't hold the source."
[ -f "$APP_DIR/package.json" ] || fail "$APP_DIR isn't the live app folder."
[ -w "$(dirname "$APP_DIR")" ] || fail "$(dirname "$APP_DIR") isn't writable by $(id -un)."
pm2 describe "$PM2_NAME" >/dev/null 2>&1 || fail "PM2 has no process named $PM2_NAME for $(id -un). The SSH user must be the one that runs PM2."
AVAIL_MB="$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)"
FREE_DISK_MB="$(df -m --output=avail "$(dirname "$APP_DIR")" | tail -1 | tr -d ' ')"
echo "node $(node -v), free RAM ${AVAIL_MB} MB, free disk ${FREE_DISK_MB} MB"
[ "$AVAIL_MB" -ge 600 ] || fail "Only ${AVAIL_MB} MB of RAM is free: building now could push the server into swapping. Try again later."
[ "$FREE_DISK_MB" -ge 2000 ] || fail "Only ${FREE_DISK_MB} MB of disk is free."

say "Preparing $STAGE"
rm -rf "$STAGE"
mkdir "$STAGE"
# What's on the server now (its own .env.production, chess-server files...), without the heavy build parts
rsync -a --exclude=node_modules --exclude=.next "$APP_DIR/" "$STAGE/"
# Then the new source. The server's .env* files stay as they are.
rsync -a --delete --exclude=node_modules --exclude=.next --exclude='.env*' "$SRC_DIR/" "$STAGE/"

if cmp -s "$APP_DIR/package-lock.json" "$STAGE/package-lock.json" && [ -d "$APP_DIR/node_modules" ]; then
  echo "Dependencies unchanged: reusing node_modules"
  cp -al "$APP_DIR/node_modules" "$STAGE/node_modules"
else
  echo "Dependencies changed: npm ci"
  (cd "$STAGE" && nice -n 10 npm ci --no-audit --no-fund) || { rm -rf "$STAGE"; fail "npm ci failed. Nothing was changed."; }
fi

say "Building"
if ! (cd "$STAGE" && NODE_OPTIONS=--max-old-space-size=1536 nice -n 10 npm run build); then
  rm -rf "$STAGE"
  fail "The build failed. The live site wasn't touched."
fi

say "Switching over"
mv "$APP_DIR" "$PREVIOUS"
mv "$STAGE" "$APP_DIR"
pm2 restart "$PM2_NAME" --update-env >/dev/null

UP=0
for _ in $(seq 1 30); do
  sleep 2
  if [ "$(curl -s -m 3 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/")" = 200 ]; then UP=1; break; fi
done

if [ "$UP" != 1 ]; then
  mv "$APP_DIR" "${APP_DIR}.failed-${STAMP}"
  mv "$PREVIOUS" "$APP_DIR"
  pm2 restart "$PM2_NAME" --update-env >/dev/null
  fail "The new app didn't answer on port $APP_PORT, so the old one is back. The failed build is in ${APP_DIR}.failed-${STAMP}."
fi

pm2 save >/dev/null 2>&1 || true
# Tidying up must never fail a deploy that worked (ls exits 2 when nothing matches)
{ ls -1dt "${APP_DIR}".before-* 2>/dev/null || true; } | tail -n +$((KEEP + 1)) | xargs -r rm -rf || true
{ ls -1dt "${APP_DIR}".failed-* 2>/dev/null || true; } | tail -n +2 | xargs -r rm -rf || true
say "App deployed (previous version kept as $PREVIOUS)"
