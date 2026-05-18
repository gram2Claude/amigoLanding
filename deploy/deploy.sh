#!/usr/bin/env bash
# Idempotent deploy: pull master from GitHub and sync the static site into
# the web root. Safe to run repeatedly (used by cron and manually).
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/amigo-site}"
CONF="/etc/amigo-deploy.conf"

# WEBROOT comes from the conf written by bootstrap.sh (or env override)
if [ -z "${WEBROOT:-}" ] && [ -f "$CONF" ]; then
  # shellcheck disable=SC1090
  . "$CONF"
fi
: "${WEBROOT:?WEBROOT is not set (run bootstrap.sh first or pass WEBROOT=...)}"

cd "$REPO_DIR"
git fetch --quiet origin master
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/master)"

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[deploy] already up to date ($LOCAL) — nothing to do"
  exit 0
fi

echo "[deploy] updating $LOCAL -> $REMOTE"
git reset --hard origin/master --quiet

# Only the static site files are published; everything else stays out of webroot.
for item in index.html privacy.html favicon.svg css js assets; do
  if [ -e "$REPO_DIR/$item" ]; then
    rsync -a --delete "$REPO_DIR/$item" "$WEBROOT/"
  fi
done

echo "[deploy] done: $(git rev-parse --short HEAD) -> $WEBROOT"
