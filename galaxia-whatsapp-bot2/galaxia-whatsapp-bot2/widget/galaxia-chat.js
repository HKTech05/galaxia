/**
 * Galaxia Resorts Chat Widget Javascript
 * Injects a robust, button-driven FAQ chat interface.
 */

(function () {
  // Config
  // Allow overriding backend URL via script dataset if needed.
  // Example: <script src="..." data-backend-url="https://api.galaxiaresorts.com"></script>
  const scriptTag = document.currentScript;
  const BACKEND_URL = (scriptTag && scriptTag.dataset.backendUrl) || "http://localhost:3000";
  const BOT_TYPE = (scriptTag && scriptTag.dataset.botType) || "staycation";
  
  // Create unique session ID per window load
  const sessionId = "web_" + Math.random().toString(36).substr(2, 9);
  
  // Inject CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${BACKEND_URL}/widget/galaxia-chat.css`;
  document.head.appendChild(link);

  // Load Google Font
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(fontLink);

  // Widget HTML Structure
  const widgetHtml = `
    <div id="galaxia-chat-widget" class="galaxia-chat-widget">
      
      <!-- Chat Window -->
      <div id="gx-chat-window" class="chat-window">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-info">
            <div class="chat-header-logo">G</div>
            <div>
              <h3 class="chat-header-title">Galaxia Assistant</h3>
              <p class="chat-header-subtitle">Always online</p>
            </div>
          </div>
          <button id="gx-close-btn" class="close-btn" aria-label="Close Chat">
            <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <!-- Messages Area -->
        <div id="gx-chat-messages" class="chat-messages">
          <div id="gx-typing" class="typing-indicator active">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>

        <!-- Options Container (Buttons only, no text input) -->
        <div id="gx-chat-options" class="chat-options">
          <!-- Option buttons injected here -->
        </div>
      </div>

      <!-- Floating Toggle Button -->
      <button id="gx-toggle-btn" class="toggle-btn" aria-label="Open Chat">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      </button>
      
    </div>
  `;

  // Inject into DOM
  const container = document.createElement('div');
  container.innerHTML = widgetHtml;
  document.body.appendChild(container);

  // DOM Elements
  const chatWindow = document.getElementById('gx-chat-window');
  const toggleBtn = document.getElementById('gx-toggle-btn');
  const closeBtn = document.getElementById('gx-close-btn');
  const messagesArea = document.getElementById('gx-chat-messages');
  const optionsArea = document.getElementById('gx-chat-options');
  const typingIndicator = document.getElementById('gx-typing');

  // State
  let isOpen = false;
  let isFirstLoad = true;

  // Formatting helpers
  function formatText(text) {
    // Basic markdown support for bold (*text*)
    return text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
  }

  // UI Actions
  function toggleChat() {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('open');
      if(window.innerWidth <= 480) toggleBtn.style.display = 'none';
      if (isFirstLoad) {
        requestMenu("main");
        isFirstLoad = false;
      }
    } else {
      chatWindow.classList.remove('open');
      toggleBtn.style.display = 'flex';
    }
  }

  toggleBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // Append User Message to UI
  function appendUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = formatText(text);
    // Insert before typing indicator
    messagesArea.insertBefore(div, typingIndicator);
    scrollToBottom();
  }

  // Append Bot Message to UI
  function appendBotMessage(data) {
    const div = document.createElement('div');
    div.className = 'message bot';
    
    let html = '';
    
    if (data.image) {
      html += `<img src="${data.image}" class="message-img" alt="Attached photo" />`;
    }
    
    html += formatText(data.message);
    
    if (data.link) {
      html += `<br><br><a href="${data.link}" target="_blank">🔗 Click here</a>`;
    }
    
    div.innerHTML = html;
    messagesArea.insertBefore(div, typingIndicator);

    // If there is a carousel, render it right after the bubble
    if (data.carousel && data.carousel.length > 0) {
      const carouselDiv = document.createElement('div');
      carouselDiv.className = 'chat-carousel';
      
      data.carousel.forEach(item => {
        const card = document.createElement('div');
        card.className = 'carousel-card';
        card.innerHTML = `
          <img src="${item.image}" class="carousel-img" alt="${item.title}" />
          <div class="carousel-content">
            <div class="carousel-title">${item.title}</div>
            <div class="carousel-rating">⭐ ${item.rating}</div>
            <div class="carousel-location">📍 ${item.location}</div>
            <div class="carousel-price">${item.price}</div>
            <button class="carousel-action">View Details</button>
          </div>
        `;
        
        // Attach click handler for "View Details"
        const actionBtn = card.querySelector('.carousel-action');
        actionBtn.onclick = () => {
          appendUserMessage("View Details: " + item.title);
          optionsArea.innerHTML = ''; 
          requestMenu(item.actionValue);
        };
        
        carouselDiv.appendChild(card);
      });
      
      messagesArea.insertBefore(carouselDiv, typingIndicator);
    }
    
    scrollToBottom();
  }

  // Render clickable options
  function renderOptions(options) {
    optionsArea.innerHTML = '';
    
    if (!options || options.length === 0) return;

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      
      let btnHtml = `<div style="font-weight:600">${opt.label}</div>`;
      if (opt.description) {
        btnHtml += `<div style="font-size:12px; color:#666; margin-top:2px;">${opt.description}</div>`;
      }
      
      btn.innerHTML = btnHtml;
      btn.onclick = () => {
        appendUserMessage(opt.label);
        optionsArea.innerHTML = ''; // Clear options immediately
        requestMenu(opt.value);
      };
      optionsArea.appendChild(btn);
    });
    
    scrollToBottom();
  }

  function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  // Network Request to Backend
  async function requestMenu(choice) {
    typingIndicator.classList.add('active');
    scrollToBottom();

    try {
      const res = await fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: sessionId, choice, botType: BOT_TYPE })
      });
      
      if (!res.ok) throw new Error("Server response not ok");
      
      const data = await res.json();
      
      // Artificial slight delay to feel natural
      setTimeout(() => {
        typingIndicator.classList.remove('active');
        appendBotMessage(data);
        renderOptions(data.options);
      }, 500);

    } catch (err) {
      console.error("[Galaxia Chat] Request failed:", err);
      typingIndicator.classList.remove('active');
      appendBotMessage({ message: "⚠️ Sorry, we are unable to connect to the server right now. Please try again later." });
      renderOptions([{ label: "🔄 Retry", value: "main" }]);
    }
  }

})();
