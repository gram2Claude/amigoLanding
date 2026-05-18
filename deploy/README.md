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
- installs a cron job that pulls `master` and re-publishes **every 3 minutes**.

Override the web root if detection is wrong:
`WEBROOT=/your/web/root bash bootstrap.sh`

## Ongoing

Nothing to do. Merging into `master` on GitHub propagates to the live site
within ~3 minutes (cron → `deploy/deploy.sh`).

Manual deploy / force now (on the server):
```
REPO_DIR=/opt/amigo-site /opt/amigo-site/deploy/deploy.sh
```

Log: `/var/log/amigo-deploy.log`

## Security note

Server credentials are kept locally in the repo-root `.env.local` (gitignored).
The shared root password should be rotated and replaced with SSH-key auth.
