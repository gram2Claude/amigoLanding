const initPageInteractions = () => {
  const WEBHOOK_URL = 'https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97';
  const REQUEST_TIMEOUT_MS = 60000;

  // configuration-sensitive: lead-form delivery to Telegram bot @amigo_igc_bot.
  // Direct browser->Telegram call by design (no backend); token is therefore
  // public. Document any change in the PR (see AGENTS.md security notes).
  const TELEGRAM_BOT_TOKEN = '8950625452:AAEK-uFPioBDOyhJHiZTujz2Fz5X-peHxmU';
  // group "amigo_orders_chat" — group ids are negative in Telegram.
  const TELEGRAM_CHAT_ID = '-5268263277';

  const initMobileMenu = () => {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navWrapper = document.querySelector('.nav-wrapper');

    if (!mobileMenuBtn || !navWrapper) return;

    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = navWrapper.classList.toggle('active');
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    });
  };

  const initCubeParallax = () => {
    const cubes = Array.from(document.querySelectorAll('.cube'));

    if (!cubes.length) return;

    let animationFrame = null;
    let pointerX = 0;
    let pointerY = 0;

    const render = () => {
      animationFrame = null;

      cubes.forEach((cube, index) => {
        const speed = ((index % 3) + 1) * 15;
        const x = -(pointerX * speed);
        const y = -(pointerY * speed);
        cube.style.transform = `translate(${x}px, ${y}px)`;
      });
    };

    const handlePointerMove = (e) => {
      pointerX = (e.clientX / window.innerWidth) - 0.5;
      pointerY = (e.clientY / window.innerHeight) - 0.5;

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(render);
      }
    };

    const moveEvent = window.PointerEvent ? 'pointermove' : 'mousemove';
    window.addEventListener(moveEvent, handlePointerMove, { passive: true });
  };

  const initChartHover = () => {
    const chartArea = document.querySelector('.chart-area');
    const hoverGuide = chartArea ? chartArea.querySelector('.chart-hover-guide') : null;
    const hoverPoints = chartArea ? Array.from(chartArea.querySelectorAll('.chart-point')) : [];
    const valueLabels = chartArea ? Array.from(chartArea.querySelectorAll('.chart-value-label')) : [];
    const series = chartArea
      ? Array.from(chartArea.querySelectorAll('[data-points]')).map((line) => {
        return line.dataset.points.split(' ').map((point) => {
          const [x, y] = point.split(',').map(Number);
          return { x, y };
        });
      })
      : [];

    if (!chartArea || !hoverGuide) return;

    const getInterpolatedY = (points, x) => {
      if (x <= points[0].x) return points[0].y;
      if (x >= points[points.length - 1].x) return points[points.length - 1].y;

      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const next = points[i];

        if (x <= next.x) {
          const progress = (x - prev.x) / (next.x - prev.x);
          return prev.y + ((next.y - prev.y) * progress);
        }
      }

      return points[points.length - 1].y;
    };

    const getValueFromY = (y) => {
      return Math.round(100 + ((80 - y) / 80) * 400);
    };

    const setGuidePosition = (clientX) => {
      const rect = chartArea.getBoundingClientRect();
      const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const svgX = (relativeX / rect.width) * 200;

      hoverGuide.setAttribute('x1', svgX.toFixed(2));
      hoverGuide.setAttribute('x2', svgX.toFixed(2));

      hoverPoints.forEach((point) => {
        const seriesIndex = Number(point.dataset.seriesIndex);
        const y = getInterpolatedY(series[seriesIndex], svgX);

        point.setAttribute('cx', svgX.toFixed(2));
        point.setAttribute('cy', y.toFixed(2));
        point.classList.add('is-active');
      });

      valueLabels.forEach((label) => {
        const seriesIndex = Number(label.dataset.seriesIndex);
        const y = getInterpolatedY(series[seriesIndex], svgX);
        const labelX = Math.min(svgX + 5, 176);
        const labelY = Math.max(y - 4, 5);

        label.setAttribute('x', labelX.toFixed(2));
        label.setAttribute('y', labelY.toFixed(2));
        label.textContent = String(getValueFromY(y));
        label.classList.add('is-active');
      });
    };

    const clearActivePoints = () => {
      hoverPoints.forEach((point) => {
        point.classList.remove('is-active');
      });
      valueLabels.forEach((label) => {
        label.classList.remove('is-active');
      });
    };

    chartArea.addEventListener('pointerenter', (e) => {
      chartArea.classList.add('is-active');
      setGuidePosition(e.clientX);
    });

    chartArea.addEventListener('pointermove', (e) => {
      setGuidePosition(e.clientX);
    }, { passive: true });

    chartArea.addEventListener('pointerleave', () => {
      chartArea.classList.remove('is-active');
      clearActivePoints();
    });

    chartArea.addEventListener('pointercancel', () => {
      chartArea.classList.remove('is-active');
      clearActivePoints();
    });
  };

  const getOrCreateSessionId = () => {
    let sessionId = sessionStorage.getItem('chatSessionId');

    if (!sessionId) {
      sessionId = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : `sess_${Math.random().toString(36).substring(2, 15)}${Date.now()}`;
      sessionStorage.setItem('chatSessionId', sessionId);
    }

    return sessionId;
  };

  const escapeHtml = (s) => {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const renderMarkdown = (s) => {
    const escaped = escapeHtml(s);
    return escaped
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  };

  const initChatWidget = () => {
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatFab || !chatWindow || !closeChatBtn || !sendChatBtn || !chatInput || !chatMessages) return;

    const sessionId = getOrCreateSessionId();
    let isSending = false;

    const scrollToBottom = () => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const openChat = () => {
      chatWindow.classList.remove('hidden');
      chatWindow.setAttribute('aria-hidden', 'false');
      chatFab.setAttribute('aria-expanded', 'true');
      chatFab.setAttribute('aria-label', 'Закрыть чат');
      chatInput.focus();
    };

    const closeChat = () => {
      chatWindow.classList.add('hidden');
      chatWindow.setAttribute('aria-hidden', 'true');
      chatFab.setAttribute('aria-expanded', 'false');
      chatFab.setAttribute('aria-label', 'Открыть чат');
    };

    const appendUserMessage = (text) => {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('chat-bubble', 'user');
      msgDiv.textContent = text;
      chatMessages.appendChild(msgDiv);
      scrollToBottom();
    };

    const appendBotMessage = (content, opts = {}) => {
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('chat-bubble', 'bot');
      if (opts.error) msgDiv.classList.add('error');
      if (opts.html) {
        msgDiv.innerHTML = content;
      } else {
        msgDiv.innerHTML = renderMarkdown(content);
      }
      chatMessages.appendChild(msgDiv);
      scrollToBottom();
      return msgDiv;
    };

    let typingEl = null;
    const appendTypingIndicator = () => {
      if (typingEl) return;
      typingEl = document.createElement('div');
      typingEl.classList.add('chat-bubble', 'bot', 'chat-typing');
      typingEl.setAttribute('aria-label', 'Помощник печатает');
      typingEl.innerHTML = '<span></span><span></span><span></span>';
      chatMessages.appendChild(typingEl);
      scrollToBottom();
    };

    const removeTypingIndicator = () => {
      if (typingEl && typingEl.parentNode) {
        typingEl.parentNode.removeChild(typingEl);
      }
      typingEl = null;
    };

    const setInputEnabled = (enabled) => {
      chatInput.disabled = !enabled;
      sendChatBtn.disabled = !enabled;
      if (enabled) chatInput.focus();
    };

    const postWithTimeout = async (url, payload, timeoutMs) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        if (!text) return null;
        try {
          return JSON.parse(text);
        } catch {
          return { output: text };
        }
      } finally {
        clearTimeout(timer);
      }
    };

    const renderClarification = ({ question, context, resumeUrl }) => {
      const safeQuestion = renderMarkdown(question || 'Я правильно понял тему вашего вопроса?');
      const topicHtml = context
        ? `<div class="chat-clarification-topic">Тема: «${renderMarkdown(context)}»</div>`
        : '';
      const html = `
        <div class="chat-clarification-text">${safeQuestion}</div>
        ${topicHtml}
        <div class="chat-clarification">
          <button type="button" data-approved="true">Да</button>
          <button type="button" data-approved="false">Нет</button>
        </div>
      `;
      const bubble = appendBotMessage(html, { html: true });
      const buttons = bubble.querySelectorAll('.chat-clarification button');

      buttons.forEach((btn) => {
        btn.addEventListener('click', async () => {
          buttons.forEach((b) => { b.disabled = true; });
          const approved = btn.dataset.approved === 'true';
          appendTypingIndicator();
          try {
            const resp = await postWithTimeout(resumeUrl, { approved }, REQUEST_TIMEOUT_MS);
            removeTypingIndicator();
            await handleResponse(resp);
          } catch (e) {
            removeTypingIndicator();
            appendBotMessage('Не удалось получить ответ. Попробуйте ещё раз.', { error: true });
          } finally {
            setInputEnabled(true);
            isSending = false;
          }
        }, { once: true });
      });
    };

    const handleResponse = async (resp) => {
      if (!resp) {
        appendBotMessage('Получен пустой ответ.', { error: true });
        return;
      }
      if (resp.type === 'clarification') {
        renderClarification(resp);
        return;
      }
      const text = typeof resp === 'string' ? resp : (resp.output || resp.text || resp.message);
      if (text) {
        appendBotMessage(text);
      } else {
        appendBotMessage('Получен ответ в неизвестном формате.', { error: true });
      }
    };

    const sendMessage = async () => {
      if (isSending) return;
      const text = chatInput.value.trim();
      if (!text) return;

      appendUserMessage(text);
      chatInput.value = '';
      setInputEnabled(false);
      isSending = true;
      appendTypingIndicator();

      let isClarification = false;
      try {
        const resp = await postWithTimeout(WEBHOOK_URL, { chatInput: text, sessionId }, REQUEST_TIMEOUT_MS);
        removeTypingIndicator();
        isClarification = resp && resp.type === 'clarification';
        await handleResponse(resp);
      } catch (e) {
        removeTypingIndicator();
        const msg = e.name === 'AbortError'
          ? 'Превышено время ожидания ответа. Попробуйте ещё раз.'
          : 'Не удалось получить ответ. Попробуйте ещё раз.';
        appendBotMessage(msg, { error: true });
      } finally {
        // Если ушли в clarification — оставляем input disabled до клика по кнопке.
        if (!isClarification) {
          setInputEnabled(true);
          isSending = false;
        }
      }
    };

    chatFab.setAttribute('aria-controls', 'chatWindow');
    chatFab.setAttribute('aria-expanded', 'false');

    chatFab.addEventListener('click', () => {
      if (chatWindow.classList.contains('hidden')) {
        openChat();
      } else {
        closeChat();
        chatFab.focus();
      }
    });

    closeChatBtn.addEventListener('click', () => {
      closeChat();
      chatFab.focus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !chatWindow.classList.contains('hidden')) {
        closeChat();
        chatFab.focus();
      }
    });

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
      }
    });
  };

  const initLeadFormModal = () => {
    const modal = document.getElementById('leadModal');
    const dialog = modal ? modal.querySelector('.lead-modal__dialog') : null;
    const closeBtn = document.getElementById('leadModalClose');
    const form = document.getElementById('leadForm');
    const triggers = Array.from(document.querySelectorAll('.js-lead-open'));

    if (!modal || !dialog || !closeBtn || !form || !triggers.length) return;

    const nameInput = document.getElementById('leadName');
    const emailInput = document.getElementById('leadEmail');
    const phoneInput = document.getElementById('leadPhone');
    const consentInput = document.getElementById('leadConsent');
    const submitBtn = document.getElementById('leadSubmit');
    const statusEl = document.getElementById('leadStatus');
    const titleEl = document.getElementById('leadModalTitle');
    const subtitleEl = document.getElementById('leadModalSubtitle');
    const defaultTitle = titleEl ? titleEl.textContent : '';
    const defaultSubtitle = subtitleEl ? subtitleEl.textContent : '';

    let isSending = false;
    let lastTrigger = null;
    let leadSource = '';

    // Local timeout-fetch helper (intentionally a private copy; chat widget
    // keeps its own — see plans/modal-lead-form.md decision 3).
    const postWithTimeout = async (url, payload, timeoutMs) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        return resp;
      } finally {
        clearTimeout(timer);
      }
    };

    const setStatus = (message, kind) => {
      statusEl.textContent = message;
      statusEl.classList.remove('is-success', 'is-error');
      if (message) {
        statusEl.classList.add('is-visible');
        if (kind) statusEl.classList.add(`is-${kind}`);
      } else {
        statusEl.classList.remove('is-visible');
      }
    };

    const setFieldError = (input, errorEl, message) => {
      if (message) {
        input.classList.add('is-invalid');
        errorEl.textContent = message;
        errorEl.classList.add('is-visible');
      } else {
        input.classList.remove('is-invalid');
        errorEl.textContent = '';
        errorEl.classList.remove('is-visible');
      }
    };

    const errorFor = (input) => document.getElementById(`${input.id}Error`);

    const formatPhone = (raw) => {
      let digits = String(raw).replace(/\D/g, '');
      if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
      if (!digits.startsWith('7')) digits = `7${digits}`;
      digits = digits.slice(0, 11);

      const rest = digits.slice(1);
      let out = '+7';
      if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
      if (rest.length >= 3) out += ')';
      if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
      if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
      if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
      return out;
    };

    const phoneDigits = () => phoneInput.value.replace(/\D/g, '');

    const validate = () => {
      let firstInvalid = null;

      const name = nameInput.value.trim();
      if (!name) {
        setFieldError(nameInput, errorFor(nameInput), 'Укажите ваше имя.');
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError(nameInput, errorFor(nameInput), '');
      }

      const email = emailInput.value.trim();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk) {
        setFieldError(emailInput, errorFor(emailInput), 'Укажите корректный адрес эл. почты.');
        firstInvalid = firstInvalid || emailInput;
      } else {
        setFieldError(emailInput, errorFor(emailInput), '');
      }

      const digits = phoneDigits();
      const phoneOk = digits.length === 11 && digits.startsWith('7');
      if (!phoneOk) {
        setFieldError(phoneInput, errorFor(phoneInput), 'Укажите номер в формате +7 (XXX) XXX-XX-XX.');
        firstInvalid = firstInvalid || phoneInput;
      } else {
        setFieldError(phoneInput, errorFor(phoneInput), '');
      }

      return { ok: !firstInvalid, firstInvalid, name, email, phone: `+${digits}` };
    };

    const syncSubmitState = () => {
      submitBtn.disabled = !consentInput.checked || isSending;
    };

    const resetForm = () => {
      form.reset();
      [nameInput, emailInput, phoneInput].forEach((input) => {
        setFieldError(input, errorFor(input), '');
      });
      syncSubmitState();
    };

    const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const trapFocus = (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(dialog.querySelectorAll(FOCUSABLE))
        .filter((el) => !el.disabled && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const onKeydown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else {
        trapFocus(e);
      }
    };

    const openModal = (trigger) => {
      lastTrigger = trigger || null;
      leadSource = (trigger && trigger.dataset.leadSource) || '';
      // header/subheader vary per trigger (e.g. «Попробовать» → demo access)
      if (titleEl) {
        titleEl.textContent = (trigger && trigger.dataset.leadTitle) || defaultTitle;
        // accent: bare data-lead-title-accent → amber; with a value (e.g.
        // "teal") → lead-modal__title--accent-<value>; absent → no accent.
        titleEl.classList.remove('lead-modal__title--accent', 'lead-modal__title--accent-teal');
        const accent = trigger && trigger.dataset.leadTitleAccent;
        if (accent !== undefined) {
          titleEl.classList.add(accent ? `lead-modal__title--accent-${accent}` : 'lead-modal__title--accent');
        }
      }
      if (subtitleEl) subtitleEl.textContent = (trigger && trigger.dataset.leadSubtitle) || defaultSubtitle;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', onKeydown);
      dialog.classList.remove('is-submitted');
      setStatus('', null);
      syncSubmitState();
      nameInput.focus();
    };

    function closeModal() {
      if (modal.classList.contains('hidden')) return;
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
    }

    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault(); // allow <a href="#"> triggers without page jump
        openModal(btn);
      });
    });

    closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    phoneInput.addEventListener('input', () => {
      const pos = phoneInput.value.length;
      phoneInput.value = formatPhone(phoneInput.value);
      if (pos >= phoneInput.value.length) {
        phoneInput.setSelectionRange(phoneInput.value.length, phoneInput.value.length);
      }
    });

    consentInput.addEventListener('change', syncSubmitState);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSending) return;

      const result = validate();
      if (!result.ok) {
        if (result.firstInvalid) result.firstInvalid.focus();
        return;
      }

      isSending = true;
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправляем…';
      setStatus('', null);

      // Moscow time regardless of the visitor's timezone
      const mskParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour12: false
      }).formatToParts(new Date()).reduce((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {});
      const mskDate = `${mskParts.year}-${mskParts.month}-${mskParts.day}`;
      const mskTime = `${mskParts.hour}:${mskParts.minute}:${mskParts.second}`;

      const tgTitle = (lastTrigger && lastTrigger.dataset.leadTgTitle)
        || 'Новая заявка с сайта Amigo';

      const text = [
        tgTitle,
        `Имя: ${result.name}`,
        `E-mail: ${result.email}`,
        `Телефон: ${result.phone}`,
        `Дата: ${mskDate}`,
        `Время: ${mskTime} (МСК)`
      ].join('\n');

      try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        // plain text, no parse_mode — user input cannot break Telegram markup.
        const resp = await postWithTimeout(
          url,
          { chat_id: TELEGRAM_CHAT_ID, text },
          REQUEST_TIMEOUT_MS
        );
        const data = await resp.json().catch(() => ({}));

        if (resp.ok && data && data.ok) {
          resetForm();
          dialog.classList.add('is-submitted');
          setStatus('Спасибо! Заявка отправлена, мы скоро свяжемся с вами.', 'success');
          // show only the confirmation text, then close the modal
          setTimeout(closeModal, 1800);
        } else {
          setStatus('Не удалось отправить заявку. Попробуйте ещё раз позже.', 'error');
        }
      } catch (err) {
        setStatus('Не удалось отправить заявку. Проверьте соединение и попробуйте снова.', 'error');
      } finally {
        isSending = false;
        submitBtn.classList.remove('is-loading');
        submitBtn.textContent = 'Отправить';
        syncSubmitState();
      }
    });
  };

  const initCookieBanner = () => {
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');

    if (!banner || !acceptBtn || !declineBtn) return;

    const STORAGE_KEY = 'cookieConsent';

    let stored = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      stored = null;
    }

    // already accepted/declined → never show again
    if (stored === 'accepted' || stored === 'declined') return;

    banner.hidden = false;
    window.requestAnimationFrame(() => banner.classList.add('is-visible'));

    const decide = (value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value);
      } catch (e) {
        /* storage unavailable — banner just won't persist */
      }
      banner.classList.remove('is-visible');
      let hidden = false;
      const hide = () => {
        if (hidden) return;
        hidden = true;
        banner.hidden = true;
        banner.removeEventListener('transitionend', hide);
      };
      banner.addEventListener('transitionend', hide);
      window.setTimeout(hide, 500); // fallback if transitionend doesn't fire
    };

    acceptBtn.addEventListener('click', () => decide('accepted'));
    declineBtn.addEventListener('click', () => decide('declined'));
  };

  const initChartLegendHover = () => {
    const containers = document.querySelectorAll('.mockup-chart-container');

    containers.forEach((container) => {
      const tagsWrap = container.querySelector('.chart-tags');
      const tags = tagsWrap ? Array.from(tagsWrap.querySelectorAll('.tag')) : [];
      const lines = Array.from(container.querySelectorAll('.chart-area svg path'));

      if (!tagsWrap || tags.length === 0 || lines.length === 0) return;

      const clear = () => lines.forEach((l) => l.classList.remove('line-on', 'line-off'));

      // tag[i] corresponds to chart line path[i] (same source order)
      tags.forEach((tag, i) => {
        tag.addEventListener('pointerenter', () => {
          lines.forEach((line, j) => {
            line.classList.toggle('line-on', j === i);
            line.classList.toggle('line-off', j !== i);
          });
        });
      });

      tagsWrap.addEventListener('pointerleave', clear);
    });
  };

  // product.html in-page section navigator: smooth-scroll on click +
  // scroll-spy that underlines the section currently in view. No-op on
  // pages without #productNav (index.html / privacy.html).
  const initProductNav = () => {
    const nav = document.getElementById('productNav');

    if (!nav) return;

    const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
    const items = links
      .map((link) => ({ link, section: document.getElementById(link.getAttribute('href').slice(1)) }))
      .filter((item) => item.section);

    if (!items.length) return;

    const setActive = (activeLink) => {
      links.forEach((link) => link.classList.toggle('is-active', link === activeLink));
    };

    items.forEach(({ link, section }) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        // smooth scroll kept on purpose under reduced-motion (Variant B)
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActive(link);
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });

    let ticking = false;
    const syncActive = () => {
      ticking = false;
      const probe = window.scrollY + window.innerHeight * 0.25;
      let current = items[0];

      items.forEach((item) => {
        const top = item.section.getBoundingClientRect().top + window.scrollY;
        if (top <= probe) current = item;
      });

      setActive(current.link);
    };

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(syncActive);
    }, { passive: true });

    syncActive();
  };

  initMobileMenu();
  initCubeParallax();
  initChartHover();
  initChatWidget();
  initLeadFormModal();
  initCookieBanner();
  initChartLegendHover();
  initProductNav();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageInteractions);
} else {
  initPageInteractions();
}
