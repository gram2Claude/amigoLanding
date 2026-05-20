---
name: deploy-allowlist-pitfall
description: deploy.sh has a hardcoded file/dir allowlist for rsync — new top-level static files must be added there or they silently never reach prod
metadata:
  type: project
---

`deploy/deploy.sh` publishes only the items hardcoded in its `for item in
… do` list (around line 24). At time of incident the list was
`index.html privacy.html favicon.svg css js assets` — `product.html` was
added later but the allowlist was not updated, so deploys kept succeeding
(`[deploy] published <sha> -> /var/www/amigo` exit 0) while the new page
never landed on prod.

**Why:** the rsync loop targets named items, not a recursive whole-repo
copy, so adding a new top-level static file to git is invisible to
`deploy.sh` unless its name is appended to that list.

**How to apply:** whenever a new top-level static file or directory is
added to the repo (new HTML page, new asset folder), update the allowlist
in `deploy/deploy.sh` in the **same** PR. After deploying, sanity-check
with `ls /var/www/amigo/<newfile>` (or `curl -sI .../newfile`) — don't
trust the `exit 0` alone. Related: [[deploy-access]],
[[cache-bust-utf8-pitfall]].
