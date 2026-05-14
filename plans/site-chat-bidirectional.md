# Plan: Site Chat — Bidirectional Integration

Связано: [`spec/site-chat-bidirectional.md`](../spec/site-chat-bidirectional.md).

## Файлы, которые будут затронуты

| Репо | Файл | Тип изменения |
|---|---|---|
| `amigoLanding` | `js/main.js` | Правки логики chat widget |
| `amigoLanding` | `css/style.css` | Новые стили: `.chat-bubble.bot`, `.chat-typing`, `.chat-clarification` |
| `amigoLanding` | `index.html` | Поднять `?v=8` → `?v=9` |
| `03_n8n` | `05_04_landing_chat_Amigo_assistent.json` | +3 узла `Respond to Webhook`, -2 узла Telegram, CORS на Webhook |

## Шаги реализации

### Шаг 1. Бэкенд (n8n workflow)

В файле `05_04_landing_chat_Amigo_assistent.json` (в репо `03_n8n`):

1.1. **Узел `Webhook` (entry):**
- `parameters.options.allowedOrigins` = `"http://45.159.79.57"` (+ опционально `http://localhost:*,http://127.0.0.1:*`).
- `httpMethod` = `POST` (уже стоит).

1.2. **3 узла `Respond to Webhook` (insert):**
- `Respond After FAQ` — после `AI Agent1` (FAQ branch).
- `Respond After KB` — после `AI Agent` (Knowledge Base branch).
- `Respond After DB` — после `DB Schema Agent`.
- У всех: `respondWith` = `json`, `responseBody` = `={{ JSON.stringify({ output: $json.output }) }}`.

1.3. **Удалить узлы:**
- `Send a text message` (Telegram, после `AI Agent1`).
- `Send a text message1` (Telegram, после `AI Agent`).

1.4. **Переподключить connections:**
- `AI Agent1.main → Respond After FAQ` (вместо `Send a text message`).
- `AI Agent.main → Respond After KB` (вместо `Send a text message1`).
- `DB Schema Agent.main → Respond After DB` (вместо `Send a text message1`).

1.5. **Узел `Respond to Webhook with Question`** — без изменений (уже корректно возвращает `{type:'clarification', question, context, resumeUrl}`).

1.6. **После импорта в n8n:**
- Включить **Active** для workflow.
- Скопировать **Production URL** webhook — должен совпадать с `https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97`.

### Шаг 2. Frontend — `js/main.js`

Полная переработка функции `initChatWidget`. Ключевые добавления:

2.1. **Состояние и helpers:**
- `let isSending = false;` — флаг для disable инпута.
- `escapeHtml(s)` — экранирование HTML.
- `renderMarkdown(s)` — мини-парсер: экранируем HTML → \`code\` → `<code>code</code>`, `\n` → `<br>`.
- `setInputEnabled(enabled)` — disabled на input + кнопке отправки.

2.2. **Сообщения:**
- `appendBotMessage(content, opts = {})` — создаёт `.chat-bubble.bot`; `opts.html=true` для clarification (вставка HTML с кнопками); `opts.error=true` → `.chat-bubble.bot.error`.
- `appendTypingIndicator()` / `removeTypingIndicator()` — `.chat-typing` с тремя точками.

2.3. **Sender — переработать `sendMessage`:**
```pseudo
if (isSending) return;
const text = chatInput.value.trim();
if (!text) return;
appendUserMessage(text);
chatInput.value = '';
setInputEnabled(false);
isSending = true;
appendTypingIndicator();

try {
  const resp = await postWithTimeout(WEBHOOK_URL, { chatInput: text, sessionId }, 60000);
  removeTypingIndicator();
  await handleResponse(resp);
} catch (e) {
  removeTypingIndicator();
  appendBotMessage('Не удалось получить ответ. Попробуйте ещё раз.', { error: true });
} finally {
  setInputEnabled(true);
  isSending = false;
}
```

2.4. **`handleResponse(resp)`** — диспетчер:
- Если `resp.type === 'clarification'` → `renderClarification(resp)`.
- Иначе если `resp.output` (или `resp` это строка) → `appendBotMessage(renderMarkdown(text))`.
- Иначе fallback: `appendBotMessage('Получен пустой ответ.', { error: true })`.

2.5. **`renderClarification({question, context, resumeUrl})`:**
- Создать bubble с текстом вопроса и двумя кнопками `<button data-approved="true">Да</button><button data-approved="false">Нет</button>`.
- На клик: блокировать обе кнопки, показать typing, POST на `resumeUrl` с `{approved: bool}`, по ответу — снова `handleResponse`.

2.6. **`postWithTimeout(url, payload, ms)`:**
- `AbortController`, `setTimeout(() => ctrl.abort(), ms)`.
- `fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload), signal: ctrl.signal })`.
- Парсит `await resp.json()`. На non-ok статус — throw с текстом.

2.7. **`WEBHOOK_URL` обновить** на `https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97` (убрать `-test`).

### Шаг 3. Frontend — `css/style.css`

Добавить в существующий блок чата (около строки 1666 где `.chat-bubble.user`):

```css
.chat-bubble.bot {
  /* нейтральный фон, выравнивание слева, тот же радиус что у .user */
}
.chat-bubble.bot.error {
  /* акцент-красный border-left или фон */
}
.chat-typing {
  /* три точки с keyframes анимацией pulse */
}
.chat-clarification {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.chat-clarification button {
  /* фирменные кнопки, hover, disabled */
}
.chat-input-area input:disabled,
.chat-input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```
Использовать CSS-переменные из существующего `:root`. Не хардкодить hex.

### Шаг 4. Frontend — `index.html`

Минимум:
- `<script src="./js/main.js?v=8" defer>` → `?v=9` (форсировать сброс кэша).

### Шаг 5. Git workflow

- Ветка: `feature/site-chat-bidirectional` (создана в `amigoLanding`).
- Коммиты:
  1. `add spec and plan for bidirectional chat`
  2. `update chat widget to read responses and handle clarification`
  3. `add bot bubble, typing and clarification styles`
  4. `bump main.js cache busting to v=9`
- В `03_n8n` коммит не нужен, если этот репо не подключён к git (а сейчас, судя по `ls`, там нет `.git` — workflow синхронизируется вручную через импорт JSON в n8n).
- Push в `origin/feature/site-chat-bidirectional` → пользователь делает PR в `master`.

### Шаг 6. Тестирование

После деплоя сайта и активации workflow в n8n:

| Сценарий | Ожидание |
|---|---|
| «как настроить рекламу в VK?» | KB ветка → bot-bubble с текстом из `documents_amigo` |
| «в какой таблице расходы Яндекс Директ?» | DB ветка → bot-bubble с именами таблиц `YD_*`, `Balance_00_41_YD` |
| FAQ-вопрос (score > 0.7) | bot-bubble с ответом из FAQ |
| Граничный (score 0.6–0.7) | bot-bubble + 2 кнопки «Да/Нет»; клик → следующий bot-bubble |
| Сетевая ошибка (отключить wifi и нажать send) | bot-bubble «Не удалось получить ответ…», input снова активен |
| Двойной клик по Send | Игнорируется (isSending=true) |
| Открыть DevTools → Network | CORS preflight OPTIONS успешен, POST возвращает JSON |
| Telegram | Сообщения **не приходят** |

## Риски и митигация

- **CORS preflight** для `Content-Type: application/json` — браузер шлёт `OPTIONS`. Webhook node в n8n должен отвечать на OPTIONS. Опция `allowedOrigins` это решает; если не сработает — добавить узел `Respond to Webhook` для метода `OPTIONS` (отдельная ветка). Проверим в DevTools.
- **`resumeUrl` от n8n использует HTTPS** на том же домене — CORS должен унаследоваться от настроек webhook node. Если нет — сообщение пользователя пойдёт, но clarification сломается. Тогда нужно настроить CORS и на узле `Wait`.
- **Большие ответы агента** — DB-ветка может вернуть многострочный ответ с DDL. Размер CSS `max-height` на `.chat-messages` уже есть, скролл должен работать. Проверить визуально.
- **Сетевые таймауты** — backend может отвечать 10–20 сек на сложных вопросах (RAG + GPT-4o). 60 сек хватит с запасом.
- **Бесконечный clarification** — теоретически workflow может попросить уточнение повторно. На практике сейчас clarification только один раз (After1 → FAQ или KB). Если изменится — UX останется корректным.

## Чек-лист готовности

- [ ] n8n: добавлены 3 `Respond to Webhook`, удалены 2 Telegram-узла, CORS прописан, workflow Active.
- [ ] `js/main.js` обновлён: новый URL, читает ответ, рендерит bot-bubble, clarification кнопки, typing, ошибки.
- [ ] `css/style.css`: добавлены стили для bot bubble, typing, clarification, disabled.
- [ ] `index.html`: `?v=9`.
- [ ] Ветка `feature/site-chat-bidirectional` запушена в origin.
- [ ] PR создан с описанием и скриншотами.
- [ ] После merge: сайт обновлён на `45.159.79.57`, workflow импортирован в n8n.
- [ ] Прогнаны 8 тест-сценариев из таблицы выше.
