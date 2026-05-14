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

    const renderClarification = ({ question, resumeUrl }) => {
      const safeQuestion = renderMarkdown(question || 'Я правильно понял тему вашего вопроса?');
      const html = `
        <div class="chat-clarification-text">${safeQuestion}</div>
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
  initChatWidget();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPageInteractions);
} else {
  initPageInteractions();
}
