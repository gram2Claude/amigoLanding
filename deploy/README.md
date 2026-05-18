# Deploy

The production server (http://45.159.79.57/) mirrors the **`master`** branch
of this public GitHub repo. Static files only.

## One-time setup (run once, as root, on the server)

```
bash <(curl -fsSL https://raw.githubusercontent.com/gram2Claude/amigoLanding/master/deploy/bootstrap.sh)
```

`bootstrap.sh`:
- installs `git`/`rsync`,
- clones the repo to `/opt/amigo-site`,
- auto-detects the web root (nginx/apache config, else common paths),
- backs up the current web root to `/var/backups/amigo-<timestamp>`,
- publishes the static files,
- **does NOT install any cron** — deploy is manual-only by design.

Override the web root if detection is wrong:
`WEBROOT=/your/web/root bash bootstrap.sh`

## Deploying a new version (explicit, on demand)

There is **no auto-update**. The live site changes only when you explicitly
run the deploy command on the server. After merging into `master`:

```
bash <(curl -fsSL https://raw.githubusercontent.com/gram2Claude/amigoLanding/master/deploy/deploy.sh)
```

This always pulls the latest `master` and republishes the static files to
the web root (idempotent — safe to run anytime). `deploy.sh` reads the web
root from `/etc/amigo-deploy.conf` written by `bootstrap.sh`.

## Security note

Server credentials are kept locally in the repo-root `.env.local` (gitignored).
The shared root password should be rotated and replaced with SSH-key auth.
