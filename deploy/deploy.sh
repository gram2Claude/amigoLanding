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
git reset --hard origin/master --quiet

# Always publish. rsync is idempotent (transfers only diffs), so this is a
# cheap no-op when the web root is already in sync, and — unlike the old
# "skip if git unchanged" logic — it also publishes on the very first run
# right after a fresh clone (when HEAD already equals origin/master).
for item in index.html privacy.html favicon.svg css js assets; do
  if [ -e "$REPO_DIR/$item" ]; then
    rsync -a --delete "$REPO_DIR/$item" "$WEBROOT/"
  fi
done

echo "[deploy] published $(git rev-parse --short HEAD) -> $WEBROOT"
