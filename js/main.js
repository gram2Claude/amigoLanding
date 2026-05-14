const initPageInteractions = () => {
  const WEBHOOK_URL = 'https://s43202e8e.fastvps-server.com/webhook/66815567-30b4-41c4-b6c0-a2aa2f15dd97';
  const REQUEST_TIMEOUT_MS = 60000;

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

  initMobileMenu();
  initCubeParallax();
  initChartHover();
  initChatWidget();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageInteractions);
} else {
  initPageInteractions();
}
