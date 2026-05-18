---
name: deploy-access
description: Where production-server deploy credentials live (pointer only — no secrets here)
metadata:
  type: reference
---

Прод-сайт: http://45.159.79.57/ (статика — index.html/css/js/assets).

Доступы к серверу деплоя **хранятся локально** в `./.env.local` в корне
репозитория (gitignored, `.gitignore:2`): переменные `DEPLOY_HOST`,
`DEPLOY_USER`, `DEPLOY_PASS`. Самих секретов здесь НЕТ намеренно — папка
`memory/` пушится в публичный GitHub.

⚠️ Безопасность: root-пароль был передан в чате открытым текстом —
рекомендовать заказчику сменить пароль и перейти на SSH-ключ + запрет
парольного root-логина. Никогда не коммитить `.env.local` и не выводить
пароль в логи/сообщения.

**Способ деплоя (зафиксирован):** сервер = зеркало ветки `master` публичного
GitHub. Скрипты в репо: `deploy/bootstrap.sh` (однократно на сервере как root:
`bash <(curl -fsSL https://raw.githubusercontent.com/gram2Claude/amigoLanding/master/deploy/bootstrap.sh)`)
и `deploy/deploy.sh` (idempotent: `git reset --hard origin/master` + rsync
статики в веб-корень). Bootstrap клонирует в `/opt/amigo-site`, детектит
web root (nginx/apache, реально `/var/www/amigo`), бэкапит старый в
`/var/backups/amigo-*`. **Только ручной деплой — БЕЗ cron** (заказчик
явно требует выкат только по команде). Канонический деплой новой версии (после merge в master) — на сервере:
`bash /opt/amigo-site/deploy/deploy.sh` (git fetch+reset --hard
origin/master + rsync; без raw-CDN). **Запускать через `bash`**: внутри
скрипт делает `git reset --hard`, что сбрасывает exec-бит → прямой
`./deploy.sh` падает с `Permission denied`. В git exec-бит выставлен
(`git update-index --chmod=+x`), но `bash …` надёжнее в любом случае.

⚠️ Грабли (исправлено): `deploy.sh` ДОЛЖЕН rsync-ить всегда. Ранняя версия
выходила с «already up to date», если git не менялся → при первом запуске
после свежего клона (HEAD уже == origin/master) сайт не публиковался
вообще. Не возвращать оптимизацию «skip if git unchanged». Реальный
web root прода: `/var/www/amigo` (nginx, server_name 45.159.79.57). Подробности —
`deploy/README.md`. См. [[forms-build-playbook]].
