---
name: telegram-lead-bot
description: Telegram bot token + delivery scheme for the lead-form modal feature
metadata:
  type: project
---

Заявки из модальной формы «Оставить заявку» доставляются напрямую через
Telegram Bot API (`sendMessage`), без бэкенда. Бот: `t.me/amigo_igc_bot`.

Token: `8950625452:AAEK-uFPioBDOyhJHiZTujz2Fz5X-peHxmU`
chat_id: `-5268263277` — Telegram group "amigo_orders_chat" (group ids are
negative; заказчик сначала дал `5268263277` без минуса → было `chat not found`).
Delivery verified via getUpdates + test sendMessage (ok:true).

Ещё не получено от заказчика: реквизиты оператора ПДн для страницы политики.
Страница политики: `privacy.html` в корне, ссылка только из формы (не в подвале).

**Why:** нужно на этапе реализации формы; см. spec `specs/modal-lead-form.md`.
**How to apply:** константы `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` наверху
`js/main.js` рядом с `WEBHOOK_URL`, помечены как configuration-sensitive.

⚠️ При прямом вызове Telegram API из браузера токен виден в публичном
`js/main.js` — осознанный компромисс, принят заказчиком. Если схему сменят
на доставку через вебхук — токен надо убрать из клиента и отозвать/обновить
у @BotFather.
