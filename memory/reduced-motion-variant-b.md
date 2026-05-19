---
name: reduced-motion-variant-b
description: This env has OS reduced-motion ON; do NOT suppress interactive transitions under prefers-reduced-motion
metadata:
  type: project
---

В среде, где заказчик смотрит сайт, **системно включён reduce-motion**.
Поэтому любое правило `@media (prefers-reduced-motion: reduce){ transition:none }`
делает hover/анимации «резкими» — заказчик это замечает и просит чинить
(карточки advantages, прайс, бегущая строка, анимация карточки 3 — каждый раз).

**Решение (Вариант B, применено site-wide):** в
`css/style.css` блок `@media (prefers-reduced-motion: reduce)` оставляет
заглушённым ТОЛЬКО `.status-dot { animation:none }` (бесконечный пульс).
Интерактивные transition (`.btn .chat-fab .chat-window .int-item
.int-icon-box .p-btn .partner-logo .t-logo .advantage-card .pricing-card`)
и hover-анимация карточки 3 — НЕ подавляются.

**Граница ambient vs hover-gated (важно для «потоковых» анимаций):**
бесконечный *ambient* луп, играющий всегда без действия пользователя
(`.status-dot`) — глушится под reduce-motion. Бесконечный луп, который
*idle = static* и запускается только на hover/взаимодействие
(прецедент: flow карточки 3 `.advantage-card:hover` → `flowSeg1/2`;
`#data-flow` коннекторы `.product-flow:hover` → `flowDash`) — НЕ глушится.
Для новых «бегущих/поток данных» эффектов предпочитать hover-gated +
idle-static: даёт движение обычным пользователям и статичный (без
регресса) вид в среде ревью с reduce-motion.

**How to apply:** при добавлении новых hover/scroll-эффектов НЕ оборачивать
их в `prefers-reduced-motion: reduce` с `animation/transition: none` —
иначе заказчик их не увидит (как и весь трафик с этой настройкой). Это
осознанный компромисс доступности, принят заказчиком. См.
[[forms-build-playbook]].
