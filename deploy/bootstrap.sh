#!/usr/bin/env bash
# One-time server setup for GitHub-master auto-deploy of the Amigo landing.
# Run once as root on 45.159.79.57. Idempotent — safe to re-run.
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/gram2Claude/amigoLanding/master/deploy/bootstrap.sh)
#
set -euo pipefail

REPO_URL="https://github.com/gram2Claude/amigoLanding.git"
REPO_DIR="/opt/amigo-site"
CONF="/etc/amigo-deploy.conf"
LOG="/var/log/amigo-deploy.log"

echo "== Amigo deploy bootstrap =="

# 1. dependencies
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y -qq && apt-get install -y -qq git rsync curl
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y -q git rsync curl
elif command -v yum >/dev/null 2>&1; then
  yum install -y -q git rsync curl
fi

# 2. clone or update the repo (public — no auth needed)
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" remote set-url origin "$REPO_URL"
  git -C "$REPO_DIR" fetch --quiet origin master
  git -C "$REPO_DIR" checkout -q master
  git -C "$REPO_DIR" reset --hard origin/master --quiet
else
  rm -rf "$REPO_DIR"
  git clone --quiet --branch master "$REPO_URL" "$REPO_DIR"
fi

# 3. detect the web root
detect_webroot() {
  if command -v nginx >/dev/null 2>&1; then
    nginx -T 2>/dev/null | grep -E '^\s*root\s' | grep -v '#' \
      | head -n1 | sed -E 's/^\s*root\s+//; s/;.*$//' | tr -d '"' && return
  fi
  if command -v apache2ctl >/dev/null 2>&1; then
    apache2ctl -S 2>/dev/null | grep -i DocumentRoot \
      | head -n1 | sed -E 's/.*DocumentRoot\s+//' | tr -d '"' && return
  fi
  for d in /var/www/html /usr/share/nginx/html /var/www; do
    [ -d "$d" ] && echo "$d" && return
  done
  echo ""
}

WEBROOT="${WEBROOT:-$(detect_webroot)}"
if [ -z "$WEBROOT" ]; then
  echo "!! Could not detect a web root. Re-run with WEBROOT=/path bash bootstrap.sh"
  exit 1
fi
WEBROOT="${WEBROOT%/}"
echo "-> web root: $WEBROOT"
mkdir -p "$WEBROOT"

# 4. back up current web-root content (once per run, non-destructive)
BACKUP="/var/backups/amigo-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP"
cp -a "$WEBROOT/." "$BACKUP/" 2>/dev/null || true
echo "-> backup of current web root: $BACKUP"

# 5. persist config
printf 'WEBROOT=%s\n' "$WEBROOT" > "$CONF"

# 6. first deploy
chmod +x "$REPO_DIR/deploy/deploy.sh"
WEBROOT="$WEBROOT" REPO_DIR="$REPO_DIR" "$REPO_DIR/deploy/deploy.sh"

# 7. cron: auto-pull master every 3 minutes
touch "$LOG"
CRON_LINE="*/3 * * * * REPO_DIR=$REPO_DIR $REPO_DIR/deploy/deploy.sh >> $LOG 2>&1"
( crontab -l 2>/dev/null | grep -v 'amigo-site/deploy/deploy.sh' ; echo "$CRON_LINE" ) | crontab -

echo "== Done. Site auto-updates from GitHub master every 3 min. Log: $LOG =="
