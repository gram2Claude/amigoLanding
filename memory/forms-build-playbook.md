---
name: forms-build-playbook
description: Reusable patterns, tooling and gotchas for building the next form on the Amigo landing
metadata:
  type: project
---

Наработки из формы «Оставить заявку» — переиспользовать для следующей формы.

**Архитектура формы/модалки:**
- Паттерн: новый самодостаточный `initX` в `js/main.js`, зарегистрирован в
  конце `initPageInteractions()`, ранний `return` если элементов нет
  (как `initLeadFormModal`). Разметка модалки — перед `<script>` в
  `index.html`; стили — отдельная секция в конце `css/style.css` на
  переменных `:root`.
- Доставка в Telegram — прямой `POST api.telegram.org/bot<TOKEN>/sendMessage`,
  `chat_id`+`text`, plain-text без `parse_mode` (защита от инъекции),
  `AbortController`+`REQUEST_TIMEOUT_MS`. Хелпер timeout-fetch держим
  локальной копией в каждом `initX` (chat-виджет не трогаем). См.
  [[telegram-lead-bot]].

**Одна модалка `#leadModal` — много назначений (через data-атрибуты
триггера `.js-lead-open`).** Новую «форму» НЕ дублировать — добавить кнопку
с атрибутами: `data-lead-title`, `data-lead-subtitle`,
`data-lead-tg-title` (первая строка ТГ-сообщения),
`data-lead-title-accent` (пусто=янтарный `#854D0E`; значение, напр.
`teal`, → класс `.lead-modal__title--accent-<value>`, цвет добавить в
css). Без атрибутов — дефолт «Оставить заявку». `openModal` читает
`lastTrigger`. Обработчик делает `e.preventDefault()`, поэтому триггером
может быть и `<a href="#">` (футер) и `<button>`. Прайсовые `mailto`
конвертированы в `<button class="p-btn js-lead-open">`. Текущие режимы:
заявка (шапка/hero), демо-доступ (Попробовать/Демо кабинет, янтарный),
встреча (Заказать Энтерпрайз, teal `#176B87`). Цвет текста-акцента на
белом — только затемнённые деривативы (фирменные `#4AB4D9`/`#D28368`
дают контраст ~2:1, не годятся).

**Адаптивные грабли (уже решены — не повторять):**
- Крестик закрытия НЕ класть в скролл-контейнер: скролл — на внутреннем
  `.lead-modal__body`, крестик — прямой потомок диалога (иначе уезжает на
  низких/landscape экранах).
- `max-height` диалога — `100dvh` с фолбэком `100vh` (моб. браузеры режут
  край при `100vh`).
- На `@media (max-width:768px)` НЕ сбрасывать `max-width` в `100%` —
  планшеты растягивают форму; узкие телефоны и так ограничены вьюпортом.
- Инпуты `font-size:16px` — иначе iOS зумит при фокусе.
- Кнопка-триггер в шапке внутри `.nav-wrapper` на ≤768px скрыта за бургером
  — на мобильном нужен видимый триггер вне сворачиваемого меню (для заявки
  решили дублёром в hero и скрыли триггер из бургера через
  `.nav-wrapper .js-lead-open{display:none}`).

**Скриншот-инструмент (для проверки адаптива):**
- `tools/screenshots/` — Playwright + Chromium, **в git игнорируется**.
  Запуск: `cd tools/screenshots && npm run shots` → PNG в `out/`.
- Модалку открывать через `page.evaluate(()=>document.querySelector(
  'header .js-lead-open').click())` — реальный `.click()` падает, т.к.
  триггер скрыт за бургером на узких ширинах.
- Для проверки скролл-кейсов: проскроллить `.lead-modal__body` и снять.

**Версии ассетов:** при деплое бампать `?v=N` у `style.css`/`main.js` (и
`privacy.html?v=N` в ссылке формы), иначе у посетителей старый кэш.
