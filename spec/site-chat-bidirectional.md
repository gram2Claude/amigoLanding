# Site Chat — Bidirectional Integration

## Context

Чат-виджет на лендинге (`http://45.159.79.57/`) уже есть в `index.html` / `js/main.js`, отправляет POST на n8n webhook с `{chatInput, sessionId}` в режиме `mode: 'no-cors'` (fire-and-forget). Ответы агентов в n8n workflow `05_04_landing_chat_Amigo_assistent` сейчас уходят **только в Telegram**, обратно на сайт не возвращаются — пользователь не видит ответа в окне чата.

Нужно сделать двустороннюю связь: ответ агента появляется в чате на сайте.

## Goals

1. Пользователь видит ответ ИИ-агента (FAQ / DB Schema / Knowledge Base) непосредственно в окне чата на сайте.
2. Уточняющий вопрос (clarification, score 0.6–0.7) показывается в чате с инлайн-кнопками **«Да» / «Нет»**; клик отправляет `approved:true/false` на `resumeUrl` и пользователь видит следующий ответ.
3. Telegram-вывод **убираем** — единственный канал ответа = сайт.
4. Без серверных доступов: правки только в репо `amigoLanding` (HTML/CSS/JS) и в JSON workflow n8n.

## Non-Goals

- Не делаем серверный персистент истории сообщений (используем `sessionStorage` как сейчас).
- Не меняем логику классификатора (DB vs KB), FAQ vector search, retrieval по schema.
- Не реализуем стриминг ответа — синхронный response (агент отвечает за 2–10 сек, это приемлемо).
- Не подключаем сторонние чат-сервисы (Crisp/Intercom).
- Не настраиваем автодеплой сайта — после merge пользователь сам обновляет сервер.

## Requirements

### Frontend (`amigoLanding`)

1. **`js/main.js`:**
   - `WEBHOOK_URL` обновить до `https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97` (без `-test`).
   - `fetch` без `mode: 'no-cors'` — нужен JSON-ответ.
   - Добавить `appendBotMessage(textOrHtml, opts)` — отрисовать ответ бота (`.chat-bubble.bot`).
   - Добавить typing-индикатор: `appendTypingIndicator()` / `removeTypingIndicator()` — показывается пока ждём ответа.
   - Обработка ответа:
     - **Текст (`{output: "..."}` или прямая строка)** → `appendBotMessage(text)`.
     - **Clarification (`{type: 'clarification', question, resumeUrl, context?}`)** → вывести сообщение бота с двумя кнопками **«Да» / «Нет»**. Клик: блокировать обе кнопки, показать typing, `fetch(resumeUrl, {method:'POST', body: JSON.stringify({approved:bool})})`, по ответу — `appendBotMessage`.
     - **Ошибка/таймаут** → `appendBotMessage('Не удалось получить ответ. Попробуйте ещё раз.')` (в стиле `.chat-bubble.bot.error`).
   - Поле ввода и кнопка отправки **disabled** пока летит запрос (чтоб не плодить параллельные сессии).
2. **`index.html`:** разметка не меняется (контейнеры `#chatMessages` / `#chatInput` / `#sendChatBtn` уже есть).
3. **`css/style.css`:** добавить стили
   - `.chat-bubble.bot` — серый/нейтральный фон, выравнивание слева.
   - `.chat-bubble.bot.error` — акцент на ошибку.
   - `.chat-typing` — три точки, анимация.
   - `.chat-clarification` (контейнер с кнопками внутри bot-bubble), `.chat-clarification button` — две кнопки «Да»/«Нет» в фирменном стиле.
4. **Аккуратность кэша:** в `index.html` параметр `?v=8` у скрипта поднять до `?v=9`.

### Backend (`n8n` workflow `05_04_landing_chat_Amigo_assistent.json`)

1. **Добавить `Respond to Webhook` в финал каждой ветки ответа:**
   - После `AI Agent1` (FAQ) → respond `{output: "..."}`
   - После `AI Agent` (Knowledge Base) → respond `{output: "..."}`
   - После `DB Schema Agent` → respond `{output: "..."}`
2. **Узлы Telegram удалить** (`Send a text message`, `Send a text message1`).
3. **CORS:** на узле `Webhook` (entry) в options выставить `allowedOrigins`:
   - `http://45.159.79.57` (prod)
   - `http://localhost:*` и `http://127.0.0.1:*` (локальная разработка) — опционально.
4. **Узел `Respond to Webhook with Question`** — оставить как есть, он уже возвращает `{type: 'clarification', question, context, resumeUrl}`.
5. Workflow должен быть **Active** (production webhook URL работает только при активном workflow).

## Data Contract (frontend ↔ webhook)

### Request (frontend → n8n)
```
POST https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97
Content-Type: application/json
Body: { "chatInput": "...", "sessionId": "uuid-v4" }
```

### Response (n8n → frontend)
**Текстовый ответ (FAQ / DB / KB):**
```json
{ "output": "Статистика по кампаниям Яндекс Директ находится в таблицах..." }
```

**Clarification (score 0.6–0.7):**
```json
{
  "type": "clarification",
  "question": "Я правильно понял тему вашего вопроса?",
  "context": "<строка контекста, может быть пустой>",
  "resumeUrl": "https://s43202e8e.fastvps-server.com/webhook-waiting/<execId>"
}
```

### Resume (frontend → n8n, после клика по «Да/Нет»)
```
POST <resumeUrl>
Content-Type: application/json
Body: { "approved": true | false }
```
Ответ — финальный текст: `{ "output": "..." }`.

## Acceptance Criteria

- Пользователь пишет в чат «как настроить рекламу в VK?» → видит ответ Knowledge Base в окне.
- Пользователь пишет «в какой таблице расходы Яндекс Директ?» → видит ответ DB Schema Agent с именами таблиц.
- При score 0.6–0.7 в чате появляется bot-сообщение с двумя кнопками «Да / Нет»; клик переключает ветку и финальный ответ показывается следующим bot-сообщением.
- Пока летит запрос — typing-индикатор; поле ввода disabled.
- Открыть чат снова в той же вкладке — `sessionId` сохраняется (это уже работает через `sessionStorage`).
- Ошибка сети / 5xx → bot-bubble с сообщением «Не удалось получить ответ…», чат остаётся рабочим.
- В Telegram сообщения **не приходят**.
- CORS: запрос с `http://45.159.79.57` проходит, с других origin — нет.

## Open Questions

1. Стилистика bot-bubble — копируем визуал брендовых цветов или нейтральный grey? *Рекомендация: использовать существующие CSS-переменные (`--color-...`) из `style.css`.*
2. Таймаут на запрос: 30 сек? 60? *Рекомендация: 60 сек, в браузере через `AbortController`.*
3. История чата при reload страницы: терять или хранить в `sessionStorage`? *Рекомендация: терять (как сейчас) — спецификация persistence истории = отдельная задача.*
4. Markdown в ответе бота: ответы агентов содержат \`backticks\` и переносы строк. Рендерить как markdown или escaped text + `<br>`? *Рекомендация: безопасный вариант — escape HTML + конвертировать `\`code\`` в `<code>`, `\n` в `<br>`.*

## Process Agreement

1. Подтверждение спеки.
2. Подготовка `plans/site-chat-bidirectional.md`, подтверждение.
3. Реализация в ветке `feature/site-chat-bidirectional` (уже создана). Параллельно — правки в `05_04_landing_chat_Amigo_assistent.json` в репо `03_n8n`.
4. Diff/commits → review → merge в `master`.
5. Пользователь обновляет сайт на сервере + импортирует обновлённый workflow в n8n + активирует.
