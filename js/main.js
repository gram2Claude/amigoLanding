document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navWrapper = document.querySelector('.nav-wrapper');
  
  if (mobileMenuBtn && navWrapper) {
    mobileMenuBtn.addEventListener('click', () => {
      navWrapper.classList.toggle('active');
    });
  }

  // Subtly shift cubes inversely to the mouse position for a floaty dimension effect
  document.addEventListener('mousemove', (e) => {
    const cubes = document.querySelectorAll('.cube');
    // Normalize mouse coordinates to center of screen: -0.5 to 0.5
    const mouseX = (e.clientX / window.innerWidth) - 0.5;
    const mouseY = (e.clientY / window.innerHeight) - 0.5;

    cubes.forEach((cube, index) => {
      // Vary speeds to create a sense of varying depth
      const speed = (index % 3 + 1) * 15;
      const x = -(mouseX * speed);
      const y = -(mouseY * speed);
      cube.style.transform = `translate(${x}px, ${y}px)`;
    });
  });

  // Chat Widget Logic
  const chatFab = document.getElementById('chatFab');
  const chatWindow = document.getElementById('chatWindow');
  const closeChatBtn = document.getElementById('closeChatBtn');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');

  if (chatFab && chatWindow) {
    chatFab.addEventListener('click', () => {
      chatWindow.classList.toggle('hidden');
      if (!chatWindow.classList.contains('hidden')) {
        chatInput.focus();
      }
    });

    closeChatBtn.addEventListener('click', () => {
      chatWindow.classList.add('hidden');
    });

    const getOrCreateSessionId = () => {
      let sessionId = sessionStorage.getItem('chatSessionId');
      if (!sessionId) {
        sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now();
        sessionStorage.setItem('chatSessionId', sessionId);
      }
      return sessionId;
    };

    const sendMessage = async () => {
      const text = chatInput.value.trim();
      if (!text) return;

      // Add visual message bubble
      const msgDiv = document.createElement('div');
      msgDiv.classList.add('chat-bubble', 'user');
      msgDiv.textContent = text;
      chatMessages.appendChild(msgDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Clear input
      chatInput.value = '';

      // Prepare payload
      const payload = {
        chatInput: text,
        sessionId: getOrCreateSessionId()
      };

      // Send to Webhook
      try {
        const response = await fetch('https://s43202e8e.fastvps-server.com/webhook-test/66815567-30b4-41c4-b6c0-a2aa2f15dd97', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        // When mode is 'no-cors', response.type is 'opaque' and response.ok is false.
        // We can't really read the status, so we just assume it was sent.
      } catch (error) {
        console.error('Error sending message to webhook:', error);
      }
    };

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
});