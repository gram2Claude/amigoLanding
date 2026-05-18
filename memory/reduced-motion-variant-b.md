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

**How to apply:** при добавлении новых hover/scroll-эффектов НЕ оборачивать
их в `prefers-reduced-motion: reduce` с `animation/transition: none` —
иначе заказчик их не увидит (как и весь трафик с этой настройкой). Это
осознанный компромисс доступности, принят заказчиком. См.
[[forms-build-playbook]].
