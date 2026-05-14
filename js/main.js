document.addEventListener('DOMContentLoaded', () => {
  const WEBHOOK_URL = 'https://s43202e8e.fastvps-server.com/webhook-test/66815567-30b4-41c4-b6c0-a2aa2f15dd97';

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
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!cubes.length || reduceMotionQuery.matches) return;

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

    document.addEventListener('mousemove', (e) => {
      pointerX = (e.clientX / window.innerWidth) - 0.5;
      pointerY = (e.clientY / window.innerHeight) - 0.5;

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(render);
      }
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

  const initChatWidget = () => {
    const chatFab = document.getElementById('chatFab');
    const chatWindow = document.getElementById('chatWindow');
    const closeChatBtn = document.getElementById('closeChatBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatFab || !chatWindow || !closeChatBtn || !sendChatBtn || !chatInput || !chatMessages) return;

    const sessionId = getOrCreateSessionId();

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
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async () => {
      const text = chatInput.value.trim();
      if (!text) return;

      appendUserMessage(text);
      chatInput.value = '';

      const payload = {
        chatInput: text,
        sessionId
      };

      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Error sending message to webhook:', error);
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
});
