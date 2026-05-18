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
web root (nginx/apache), бэкапит старый в `/var/backups/amigo-*`, ставит
cron каждые 3 мин. Лог `/var/log/amigo-deploy.log`. Дальнейшие деплои —
автоматически по merge в `master`, ручных шагов нет. Подробности —
`deploy/README.md`. См. [[forms-build-playbook]].
