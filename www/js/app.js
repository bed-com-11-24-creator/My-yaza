/**
 * MyYaza Main Application Controller
 */
(function () {
  'use strict';

  // Instantiate Modules
  const config = window.MyYazaConfig;
  const speechManager = new window.SpeechToTextManager();
  const authManager = new window.AuthManager();
  const historyManager = new window.HistoryManager();

  // DOM Elements
  const chatContainer = document.getElementById('chatContainer');
  const emptyState = document.getElementById('emptyState');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const inputWrapper = document.getElementById('inputWrapper');
  const newChatBtn = document.getElementById('newChatBtn');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
  const userAuthBtn = document.getElementById('userAuthBtn');
  const userAvatarText = document.getElementById('userAvatarText');
  const headerSyncStatus = document.getElementById('headerSyncStatus');
  const sessionTitleDisplay = document.getElementById('sessionTitleDisplay');
  const exportSessionBtn = document.getElementById('exportSessionBtn');
  const deleteSessionBtn = document.getElementById('deleteSessionBtn');
  const offlineBanner = document.getElementById('offlineBanner');
  const settingsPanel = document.getElementById('settingsPanel');
  const providerBar = document.getElementById('providerBar');
  const providerSelectBtn = document.getElementById('providerSelectBtn');
  const activeProviderDot = document.getElementById('activeProviderDot');
  const activeProviderName = document.getElementById('activeProviderName');
  const activeProviderTag = document.getElementById('activeProviderTag');
  const activeModelTag = document.getElementById('activeModelTag');
  const trialPill = document.getElementById('trialPill');
  const trialPillText = document.getElementById('trialPillText');
  const limitHintText = document.getElementById('limitHintText');
  const limitModal = document.getElementById('limitModal');
  const modalOpenSettingsBtn = document.getElementById('modalOpenSettingsBtn');
  const modalDismissBtn = document.getElementById('modalDismissBtn');
  const saveKeysBtn = document.getElementById('saveKeysBtn');
  const clearKeysBtn = document.getElementById('clearKeysBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Drawer
  const historyDrawer = document.getElementById('historyDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const drawerNewChatBtn = document.getElementById('drawerNewChatBtn');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
  const historyList = document.getElementById('historyList');
  const historySearchInput = document.getElementById('historySearchInput');

  // Auth Modal
  const authModal = document.getElementById('authModal');
  const authProfileView = document.getElementById('authProfileView');
  const authFormView = document.getElementById('authFormView');
  const authTabLogin = document.getElementById('authTabLogin');
  const authTabSignup = document.getElementById('authTabSignup');
  const authModeDesc = document.getElementById('authModeDesc');
  const nameInputGroup = document.getElementById('nameInputGroup');
  const authNameInput = document.getElementById('authNameInput');
  const authEmailInput = document.getElementById('authEmailInput');
  const authPasswordInput = document.getElementById('authPasswordInput');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authErrorMsg = document.getElementById('authErrorMsg');
  const continueAsGuestBtn = document.getElementById('continueAsGuestBtn');
  const profileEmailDisplay = document.getElementById('profileEmailDisplay');
  const profileNameDisplay = document.getElementById('profileNameDisplay');
  const manualSyncBtn = document.getElementById('manualSyncBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const closeProfileBtn = document.getElementById('closeProfileBtn');
  const guestSignInPromptBtn = document.getElementById('guestSignInPromptBtn');

  // Settings Inputs
  const openrouterKeyInput = document.getElementById('openrouterKey');
  const groqKeyInput = document.getElementById('groqKey');
  const geminiKeyInput = document.getElementById('geminiKey');
  const badgeOpenrouter = document.getElementById('badgeOpenrouter');
  const badgeGroq = document.getElementById('badgeGroq');
  const badgeGemini = document.getElementById('badgeGemini');

  // State
  let currentProviderId = localStorage.getItem(config.STORAGE_KEYS.ACTIVE_PROVIDER) || 'chatgpt';
  if (!config.PROVIDERS[currentProviderId]) currentProviderId = 'chatgpt';
  let isGenerating = false;
  let lastFailedPrompt = null;
  let authMode = 'login';

  // -----------------------------------------------------------
  // Toast Notification
  // -----------------------------------------------------------
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // -----------------------------------------------------------
  // Voice-to-Text: Web Speech API Integration
  // -----------------------------------------------------------
  function initSpeechRecognition() {
    if (!speechManager.isSupported) {
      micBtn.title = 'Voice input not supported in this browser';
      micBtn.style.opacity = '0.4';
    }

    micBtn.addEventListener('click', () => {
      if (userInput.disabled) {
        showLimitReachedModal();
        return;
      }

      speechManager.toggle({
        onStart: () => {
          micBtn.classList.add('active');
          inputWrapper.classList.add('listening');
          userInput.placeholder = 'Listening... Speak now 🎙️';
          showToast('Microphone listening... Speak now.');
        },
        onTranscript: (result) => {
          userInput.value = result.full;
          userInput.style.height = 'auto';
          userInput.style.height = Math.min(userInput.scrollHeight, 130) + 'px';
          sendBtn.disabled = !userInput.value.trim() || isGenerating;
        },
        onEnd: () => {
          micBtn.classList.remove('active');
          inputWrapper.classList.remove('listening');
          userInput.placeholder = 'Ask MyYaza anything... (Shift+Enter for line)';
        },
        onError: (errMessage) => {
          micBtn.classList.remove('active');
          inputWrapper.classList.remove('listening');
          userInput.placeholder = 'Ask MyYaza anything... (Shift+Enter for line)';
          showToast(errMessage);
        }
      });
    });
  }

  // -----------------------------------------------------------
  // Offline Connection Banner
  // -----------------------------------------------------------
  function updateNetworkStatus() {
    if (!navigator.onLine) offlineBanner.classList.add('active');
    else offlineBanner.classList.remove('active');
  }
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  updateNetworkStatus();

  // -----------------------------------------------------------
  // Quota & BYOK Logic
  // -----------------------------------------------------------
  function getQuestionsUsed() {
    const count = parseInt(localStorage.getItem(config.STORAGE_KEYS.QUESTION_COUNT) || '0', 10);
    return isNaN(count) ? 0 : count;
  }

  function incrementQuestionsUsed() {
    const next = getQuestionsUsed() + 1;
    localStorage.setItem(config.STORAGE_KEYS.QUESTION_COUNT, next.toString());
    updateQuotaUI();
    return next;
  }

  function hasSavedKeyForProvider(providerId) {
    const prov = config.PROVIDERS[providerId];
    if (!prov) return false;
    const key = (localStorage.getItem(prov.keyStorageKey) || '').trim();
    return key.length > 5;
  }

  function updateQuotaUI() {
    const used = getQuestionsUsed();
    const hasKey = hasSavedKeyForProvider(currentProviderId);

    trialPill.className = 'trial-pill';

    if (hasKey) {
      trialPill.classList.add('active-byok');
      trialPillText.textContent = 'BYOK Active ✨';
      limitHintText.textContent = 'Unlimited access with your personal key.';
      enableInput();
    } else {
      trialPillText.textContent = `Trial: ${used}/${config.FREE_QUESTION_LIMIT}`;
      const remaining = Math.max(0, config.FREE_QUESTION_LIMIT - used);

      if (used >= config.FREE_QUESTION_LIMIT) {
        trialPill.classList.add('limit-reached');
        limitHintText.textContent = 'Free limit reached. Add API key in Settings.';
        disableInputForLimit();
      } else {
        limitHintText.textContent = `${remaining} free question${remaining === 1 ? '' : 's'} remaining without API key.`;
        enableInput();
      }
    }
  }

  function disableInputForLimit() {
    userInput.disabled = true;
    sendBtn.disabled = true;
    micBtn.disabled = true;
    inputWrapper.classList.add('disabled');
    userInput.placeholder = 'Free limit reached! Add your free API key in Settings.';
  }

  function enableInput() {
    userInput.disabled = false;
    micBtn.disabled = false;
    inputWrapper.classList.remove('disabled');
    userInput.placeholder = 'Ask MyYaza anything... (Shift+Enter for line)';
    sendBtn.disabled = !userInput.value.trim() || isGenerating;
  }

  function showLimitReachedModal() {
    limitModal.classList.add('active');
  }
  function hideLimitReachedModal() {
    limitModal.classList.remove('active');
  }

  // -----------------------------------------------------------
  // Provider Selection
  // -----------------------------------------------------------
  function setProvider(providerId) {
    if (!config.PROVIDERS[providerId]) return;
    currentProviderId = providerId;
    localStorage.setItem(config.STORAGE_KEYS.ACTIVE_PROVIDER, providerId);

    const prov = config.PROVIDERS[providerId];
    activeProviderName.textContent = prov.name;
    activeProviderTag.textContent = prov.tag;
    activeProviderDot.style.background = prov.color;
    activeProviderDot.style.boxShadow = `0 0 8px ${prov.color}`;
    activeModelTag.textContent = `Engine: ${prov.name}`;

    document.querySelectorAll('.provider-option').forEach(el => {
      el.classList.toggle('selected', el.dataset.provider === providerId);
    });

    providerBar.classList.remove('open');
    updateQuotaUI();
  }

  // -----------------------------------------------------------
  // Markdown & Code Snippets Formatting
  // -----------------------------------------------------------
  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderMarkdown(rawText) {
    if (!rawText) return '';
    const codeBlocks = [];

    let processed = rawText.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const index = codeBlocks.length;
      const cleanLang = (lang || 'plaintext').trim().toLowerCase();
      codeBlocks.push({ lang: cleanLang, code: code.trim() });
      return `__MYYAZA_CODE_BLOCK_${index}__`;
    });

    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/`([^`]+)`/g, (m, c) => `<code>${escapeHtml(c)}</code>`);

    const lines = processed.split('\n');
    let htmlOutput = '';
    let inList = false;

    for (let line of lines) {
      line = line.trim();
      if (!line) {
        if (inList) { htmlOutput += '</ul>'; inList = false; }
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!inList) { htmlOutput += '<ul>'; inList = true; }
        htmlOutput += `<li>${line.substring(2)}</li>`;
      } else if (/^\d+\.\s/.test(line)) {
        if (!inList) { htmlOutput += '<ol>'; inList = true; }
        htmlOutput += `<li>${line.replace(/^\d+\.\s/, '')}</li>`;
      } else if (line.startsWith('### ')) {
        if (inList) { htmlOutput += inList ? '</ul>' : ''; inList = false; }
        htmlOutput += `<h4 style="margin:8px 0 4px;font-size:14px;color:#fff;">${line.substring(4)}</h4>`;
      } else if (line.startsWith('## ')) {
        if (inList) { htmlOutput += inList ? '</ul>' : ''; inList = false; }
        htmlOutput += `<h3 style="margin:10px 0 6px;font-size:15px;color:#fff;">${line.substring(3)}</h3>`;
      } else {
        if (inList) { htmlOutput += '</ul>'; inList = false; }
        htmlOutput += `<p>${line}</p>`;
      }
    }
    if (inList) htmlOutput += '</ul>';

    codeBlocks.forEach((block, idx) => {
      const escapedCode = escapeHtml(block.code);
      const langLabel = block.lang || 'code';
      const codeBlockHtml = `
        <div class="code-container">
          <div class="code-header">
            <span>${langLabel}</span>
            <button class="copy-code-btn" type="button" onclick="window.copyCodeSnippet(this)">
              <svg style="width:12px;height:12px;stroke:currentColor;fill:none;" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
              Copy Code
            </button>
          </div>
          <pre><code class="language-${langLabel}">${escapedCode}</code></pre>
        </div>
      `;
      htmlOutput = htmlOutput.replace(`__MYYAZA_CODE_BLOCK_${idx}__`, codeBlockHtml);
    });

    return htmlOutput;
  }

  window.copyCodeSnippet = function (btnElement) {
    const codeElement = btnElement.closest('.code-container').querySelector('code');
    if (!codeElement) return;

    navigator.clipboard.writeText(codeElement.innerText).then(() => {
      btnElement.classList.add('copied');
      btnElement.innerHTML = `✓ Copied!`;
      setTimeout(() => {
        btnElement.classList.remove('copied');
        btnElement.innerHTML = `
          <svg style="width:12px;height:12px;stroke:currentColor;fill:none;" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg>
          Copy Code
        `;
      }, 2000);
    }).catch(err => console.error('Failed to copy code: ', err));
  };

  // -----------------------------------------------------------
  // Message Rendering in Chat Container
  // -----------------------------------------------------------
  function appendUserMessageDOM(text, timestamp = Date.now()) {
    emptyState.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row user';
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <div class="message-bubble-wrapper">
        <div class="message-meta"><span>You</span> • <span>${time}</span></div>
        <div class="message-bubble">
          <p>${escapeHtml(text).replace(/\n/g, '<br/>')}</p>
        </div>
      </div>
    `;
    chatContainer.appendChild(row);
  }

  function appendAssistantMessageDOM(content, providerId, timestamp = Date.now(), isError = false) {
    emptyState.style.display = 'none';
    const provider = config.PROVIDERS[providerId] || config.PROVIDERS.chatgpt;

    const row = document.createElement('div');
    row.className = 'message-row assistant';
    const time = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isError) {
      row.innerHTML = `
        <div class="message-avatar assistant" style="border-color:#ef4444;color:#ef4444;">⚠️</div>
        <div class="message-bubble-wrapper">
          <div class="message-meta"><span style="color:#ef4444;font-weight:600;">System Alert</span> • <span>${time}</span></div>
          <div class="message-bubble error-bubble">
            <div class="error-card">
              <div class="error-card-title">⚠️ Request Failed</div>
              <div class="error-card-desc">${escapeHtml(content).replace(/\n/g, '<br/>')}</div>
              <div class="error-card-actions">
                <button class="error-action-btn retry" type="button" onclick="window.retryLastPrompt()">🔄 Retry</button>
                <button class="error-action-btn" type="button" onclick="window.openSettingsDirectly()">⚙️ Settings</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      row.innerHTML = `
        <div class="message-avatar assistant" style="border-color:${provider.color};color:${provider.color};">
          ${provider.name.charAt(0)}
        </div>
        <div class="message-bubble-wrapper">
          <div class="message-meta">
            <span style="color:${provider.color};font-weight:600;">${provider.name}</span> • <span>${time}</span>
          </div>
          <div class="message-bubble">
            ${renderMarkdown(content)}
          </div>
        </div>
      `;
      if (window.Prism) {
        row.querySelectorAll('pre code').forEach(block => Prism.highlightElement(block));
      }
    }

    chatContainer.appendChild(row);
  }

  function appendTypingIndicator(provider) {
    emptyState.style.display = 'none';
    const row = document.createElement('div');
    row.className = 'message-row assistant typing-row';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = `
      <div class="message-avatar assistant" style="border-color:${provider.color};color:${provider.color};">
        ${provider.name.charAt(0)}
      </div>
      <div class="message-bubble-wrapper">
        <div class="message-meta">
          <span style="color:${provider.color};font-weight:600;">${provider.name}</span> • <span>${time}</span>
        </div>
        <div class="message-bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;
    chatContainer.appendChild(row);
    scrollToBottom();
    return row;
  }

  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  window.retryLastPrompt = function () {
    if (!lastFailedPrompt || isGenerating) return;
    userInput.value = lastFailedPrompt;
    handleSendMessage();
  };

  window.openSettingsDirectly = function () {
    settingsPanel.classList.add('open');
    toggleSettingsBtn.classList.add('active');
    settingsPanel.scrollIntoView({ behavior: 'smooth' });
  };

  // -----------------------------------------------------------
  // Session UI Switching
  // -----------------------------------------------------------
  function loadSessionToUI(sessionId) {
    const session = historyManager.getSession(sessionId);
    if (!session) return;

    historyManager.setActiveSessionId(sessionId);
    sessionTitleDisplay.textContent = session.title;
    chatContainer.innerHTML = '';

    if (!session.messages.length) {
      chatContainer.appendChild(emptyState);
      emptyState.style.display = 'flex';
    } else {
      emptyState.style.display = 'none';
      session.messages.forEach(m => {
        if (m.role === 'user') {
          appendUserMessageDOM(m.content, m.timestamp);
        } else {
          appendAssistantMessageDOM(m.content, m.provider || session.providerId, m.timestamp, m.isError);
        }
      });
    }
    scrollToBottom();
    renderHistoryDrawerList();
  }

  function startNewConversation() {
    const newSession = historyManager.createSession(currentProviderId);
    loadSessionToUI(newSession.id);
  }

  // -----------------------------------------------------------
  // Message Transmission
  // -----------------------------------------------------------
  async function handleSendMessage() {
    const text = userInput.value.trim();
    if (!text || isGenerating) return;

    // Stop speech recognition if still listening
    speechManager.stop();

    if (!navigator.onLine) {
      appendUserMessageDOM(text);
      appendAssistantMessageDOM(
        "Network Offline: You appear to be disconnected from the internet. Please reconnect and retry.",
        currentProviderId,
        Date.now(),
        true
      );
      return;
    }

    const hasKey = hasSavedKeyForProvider(currentProviderId);
    const currentCount = getQuestionsUsed();

    if (!hasKey && currentCount >= config.FREE_QUESTION_LIMIT) {
      showLimitReachedModal();
      disableInputForLimit();
      return;
    }

    if (!hasKey) {
      incrementQuestionsUsed();
    }

    lastFailedPrompt = text;
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    isGenerating = true;

    // Get current session
    let activeId = historyManager.getActiveSessionId();
    if (!activeId || !historyManager.getSession(activeId)) {
      const created = historyManager.createSession(currentProviderId);
      activeId = created.id;
    }

    historyManager.addMessage(activeId, 'user', text, currentProviderId);
    sessionTitleDisplay.textContent = historyManager.getSession(activeId).title;
    appendUserMessageDOM(text);
    scrollToBottom();

    const providerConfig = config.PROVIDERS[currentProviderId];
    const typingRow = appendTypingIndicator(providerConfig);

    try {
      const savedKey = (localStorage.getItem(providerConfig.keyStorageKey) || '').trim();
      const responseText = await window.AIService.generate(text, currentProviderId, savedKey);
      typingRow.remove();

      historyManager.addMessage(activeId, 'assistant', responseText, currentProviderId, false);
      appendAssistantMessageDOM(responseText, currentProviderId, Date.now(), false);
      lastFailedPrompt = null;
    } catch (error) {
      typingRow.remove();
      console.error('Generation Error:', error);
      const friendlyMessage = window.AIService.formatError(error);

      historyManager.addMessage(activeId, 'assistant', friendlyMessage, currentProviderId, true);
      appendAssistantMessageDOM(friendlyMessage, currentProviderId, Date.now(), true);
    } finally {
      isGenerating = false;
      enableInput();
      updateQuotaUI();
      renderHistoryDrawerList();
      scrollToBottom();

      if (!hasSavedKeyForProvider(currentProviderId) && getQuestionsUsed() >= config.FREE_QUESTION_LIMIT) {
        setTimeout(showLimitReachedModal, 600);
      }
    }
  }

  // -----------------------------------------------------------
  // History Drawer Rendering
  // -----------------------------------------------------------
  function renderHistoryDrawerList(filter = '') {
    const sessions = historyManager.getSessions();
    const sorted = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
    historyList.innerHTML = '';

    const query = filter.toLowerCase().trim();
    const filtered = sorted.filter(s => {
      if (!query) return true;
      if (s.title.toLowerCase().includes(query)) return true;
      return s.messages.some(m => m.content.toLowerCase().includes(query));
    });

    if (!filtered.length) {
      historyList.innerHTML = `<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted);">No conversations found.</div>`;
      return;
    }

    const currentId = historyManager.getActiveSessionId();
    filtered.forEach(s => {
      const item = document.createElement('div');
      item.className = `history-item ${s.id === currentId ? 'active' : ''}`;
      const dateStr = new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

      item.innerHTML = `
        <div class="history-item-info">
          <span class="history-item-title">${escapeHtml(s.title)}</span>
          <span class="history-item-meta">${dateStr} • ${s.messages.length} msg${s.messages.length === 1 ? '' : 's'}</span>
        </div>
        <button class="history-delete-btn" title="Delete conversation" aria-label="Delete">
          <svg style="width:14px;height:14px;stroke:currentColor;fill:none;" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.history-delete-btn')) return;
        loadSessionToUI(s.id);
        closeDrawer();
      });

      item.querySelector('.history-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        historyManager.deleteSession(s.id);
        if (currentId === s.id) {
          const remaining = Object.keys(historyManager.getSessions());
          if (remaining.length) loadSessionToUI(remaining[remaining.length - 1]);
          else startNewConversation();
        } else {
          renderHistoryDrawerList();
        }
        showToast('Conversation deleted.');
      });

      historyList.appendChild(item);
    });
  }

  function openDrawer() {
    renderHistoryDrawerList(historySearchInput.value);
    drawerOverlay.classList.add('active');
    historyDrawer.classList.add('active');
  }

  function closeDrawer() {
    drawerOverlay.classList.remove('active');
    historyDrawer.classList.remove('active');
  }

  // -----------------------------------------------------------
  // Auth & Cloud Sync
  // -----------------------------------------------------------
  function updateUserAuthUI() {
    const user = authManager.getCurrentUser();
    if (user) {
      userAvatarText.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
      userAuthBtn.classList.remove('guest');
      headerSyncStatus.textContent = 'Synced ☁️';
      headerSyncStatus.style.color = '#34d399';
      document.getElementById('guestSyncTeaser').style.display = 'none';
    } else {
      userAvatarText.textContent = '👤';
      userAuthBtn.classList.add('guest');
      headerSyncStatus.textContent = 'Local 💾';
      headerSyncStatus.style.color = 'var(--text-secondary)';
      document.getElementById('guestSyncTeaser').style.display = 'flex';
    }
  }

  function openAuthModal() {
    const user = authManager.getCurrentUser();
    if (user) {
      authProfileView.style.display = 'flex';
      authFormView.style.display = 'none';
      profileEmailDisplay.textContent = user.email;
      profileNameDisplay.textContent = user.name || 'MyYaza User';
    } else {
      authProfileView.style.display = 'none';
      authFormView.style.display = 'flex';
      setAuthMode('login');
    }
    authModal.classList.add('active');
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
    authErrorMsg.style.display = 'none';
  }

  function setAuthMode(mode) {
    authMode = mode;
    authErrorMsg.style.display = 'none';
    if (mode === 'signup') {
      authTabSignup.classList.add('active');
      authTabLogin.classList.remove('active');
      nameInputGroup.style.display = 'block';
      authSubmitBtn.textContent = 'Create Free Account';
      authModeDesc.textContent = 'Create an account to securely sync your chats and BYOK keys across devices.';
    } else {
      authTabLogin.classList.add('active');
      authTabSignup.classList.remove('active');
      nameInputGroup.style.display = 'none';
      authSubmitBtn.textContent = 'Log In';
      authModeDesc.textContent = 'Sign in to access your saved chat sessions and personal BYOK keys.';
    }
  }

  // -----------------------------------------------------------
  // BYOK Settings
  // -----------------------------------------------------------
  function loadSavedKeys() {
    openrouterKeyInput.value = localStorage.getItem(config.STORAGE_KEYS.OPENROUTER_KEY) || '';
    groqKeyInput.value = localStorage.getItem(config.STORAGE_KEYS.GROQ_KEY) || '';
    geminiKeyInput.value = localStorage.getItem(config.STORAGE_KEYS.GEMINI_KEY) || '';
    updateKeyBadges();
  }

  function updateKeyBadges() {
    const orSet = openrouterKeyInput.value.trim().length > 5;
    const groqSet = groqKeyInput.value.trim().length > 5;
    const geminiSet = geminiKeyInput.value.trim().length > 5;

    badgeOpenrouter.textContent = orSet ? 'Saved ✓' : 'Not set';
    badgeOpenrouter.className = `key-status-indicator ${orSet ? 'saved' : ''}`;

    badgeGroq.textContent = groqSet ? 'Saved ✓' : 'Not set';
    badgeGroq.className = `key-status-indicator ${groqSet ? 'saved' : ''}`;

    badgeGemini.textContent = geminiSet ? 'Saved ✓' : 'Not set';
    badgeGemini.className = `key-status-indicator ${geminiSet ? 'saved' : ''}`;
  }

  function saveKeys() {
    const orKey = openrouterKeyInput.value.trim();
    const groqKey = groqKeyInput.value.trim();
    const geminiKey = geminiKeyInput.value.trim();

    if (orKey) localStorage.setItem(config.STORAGE_KEYS.OPENROUTER_KEY, orKey);
    else localStorage.removeItem(config.STORAGE_KEYS.OPENROUTER_KEY);

    if (groqKey) localStorage.setItem(config.STORAGE_KEYS.GROQ_KEY, groqKey);
    else localStorage.removeItem(config.STORAGE_KEYS.GROQ_KEY);

    if (geminiKey) localStorage.setItem(config.STORAGE_KEYS.GEMINI_KEY, geminiKey);
    else localStorage.removeItem(config.STORAGE_KEYS.GEMINI_KEY);

    updateKeyBadges();
    updateQuotaUI();
    showToast('API Keys saved successfully to localStorage!');
  }

  function clearKeys() {
    if (!confirm('Clear all stored API keys from this device?')) return;
    localStorage.removeItem(config.STORAGE_KEYS.OPENROUTER_KEY);
    localStorage.removeItem(config.STORAGE_KEYS.GROQ_KEY);
    localStorage.removeItem(config.STORAGE_KEYS.GEMINI_KEY);

    openrouterKeyInput.value = '';
    groqKeyInput.value = '';
    geminiKeyInput.value = '';

    updateKeyBadges();
    updateQuotaUI();
    showToast('All stored keys cleared.');
  }

  // -----------------------------------------------------------
  // Event Bindings
  // -----------------------------------------------------------
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 130) + 'px';
    sendBtn.disabled = !userInput.value.trim() || isGenerating || userInput.disabled;
  });

  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  sendBtn.addEventListener('click', handleSendMessage);
  newChatBtn.addEventListener('click', startNewConversation);
  drawerNewChatBtn.addEventListener('click', () => {
    startNewConversation();
    closeDrawer();
  });

  exportSessionBtn.addEventListener('click', () => {
    const currentId = historyManager.getActiveSessionId();
    const session = historyManager.getSession(currentId);
    const md = historyManager.exportAsMarkdown(session);
    if (!md) {
      showToast('No messages in this chat to export.');
      return;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Chat exported as Markdown file!');
  });

  deleteSessionBtn.addEventListener('click', () => {
    const currentId = historyManager.getActiveSessionId();
    if (!currentId) return;
    historyManager.deleteSession(currentId);
    const remaining = Object.keys(historyManager.getSessions());
    if (remaining.length) loadSessionToUI(remaining[remaining.length - 1]);
    else startNewConversation();
    showToast('Conversation cleared.');
  });

  clearAllHistoryBtn.addEventListener('click', () => {
    if (!confirm('Clear all conversation history?')) return;
    historyManager.clearAll();
    startNewConversation();
    closeDrawer();
    showToast('All history cleared.');
  });

  toggleHistoryBtn.addEventListener('click', openDrawer);
  closeDrawerBtn.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  historySearchInput.addEventListener('input', (e) => renderHistoryDrawerList(e.target.value));

  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (userInput.disabled) {
        showLimitReachedModal();
        return;
      }
      userInput.value = chip.dataset.prompt;
      userInput.dispatchEvent(new Event('input'));
      handleSendMessage();
    });
  });

  providerSelectBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    providerBar.classList.toggle('open');
  });

  document.querySelectorAll('.provider-option').forEach(opt => {
    opt.addEventListener('click', () => setProvider(opt.dataset.provider));
  });

  document.addEventListener('click', (e) => {
    if (!providerBar.contains(e.target)) providerBar.classList.remove('open');
  });

  toggleSettingsBtn.addEventListener('click', () => {
    const isOpen = settingsPanel.classList.toggle('open');
    toggleSettingsBtn.classList.toggle('active', isOpen);
  });
  trialPill.addEventListener('click', () => {
    settingsPanel.classList.add('open');
    toggleSettingsBtn.classList.add('active');
    settingsPanel.scrollIntoView({ behavior: 'smooth' });
  });

  saveKeysBtn.addEventListener('click', saveKeys);
  clearKeysBtn.addEventListener('click', clearKeys);

  document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById(btn.dataset.target);
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  modalOpenSettingsBtn.addEventListener('click', () => {
    hideLimitReachedModal();
    settingsPanel.classList.add('open');
    toggleSettingsBtn.classList.add('active');
    settingsPanel.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => openrouterKeyInput.focus(), 300);
  });
  modalDismissBtn.addEventListener('click', hideLimitReachedModal);
  limitModal.addEventListener('click', (e) => {
    if (e.target === limitModal) hideLimitReachedModal();
  });

  // Auth Modal
  userAuthBtn.addEventListener('click', openAuthModal);
  guestSignInPromptBtn.addEventListener('click', openAuthModal);
  authTabLogin.addEventListener('click', () => setAuthMode('login'));
  authTabSignup.addEventListener('click', () => setAuthMode('signup'));
  continueAsGuestBtn.addEventListener('click', closeAuthModal);
  closeProfileBtn.addEventListener('click', closeAuthModal);
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeAuthModal();
  });

  authSubmitBtn.addEventListener('click', () => {
    const email = authEmailInput.value;
    const pass = authPasswordInput.value;
    const name = authNameInput.value;
    try {
      if (authMode === 'signup') {
        authManager.signUp(name, email, pass);
        showToast('Account created! Cloud sync is active.');
      } else {
        authManager.logIn(email, pass);
        showToast('Logged in successfully!');
      }
      updateUserAuthUI();
      closeAuthModal();
    } catch (err) {
      authErrorMsg.textContent = err.message;
      authErrorMsg.style.display = 'block';
    }
  });

  logoutBtn.addEventListener('click', () => {
    if (!confirm('Log out from MyYaza?')) return;
    authManager.logOut();
    updateUserAuthUI();
    closeAuthModal();
    showToast('Logged out to Guest mode.');
  });

  manualSyncBtn.addEventListener('click', () => {
    showToast('Chats and settings synced with cloud account! ☁️');
  });

  // -----------------------------------------------------------
  // Bootstrapping
  // -----------------------------------------------------------
  initSpeechRecognition();
  updateUserAuthUI();
  loadSavedKeys();
  setProvider(currentProviderId);
  updateQuotaUI();

  // Active session restoration
  const savedSessions = historyManager.getSessions();
  const lastActiveId = historyManager.getActiveSessionId();

  if (lastActiveId && savedSessions[lastActiveId]) {
    loadSessionToUI(lastActiveId);
  } else {
    const keys = Object.keys(savedSessions);
    if (keys.length) loadSessionToUI(keys[keys.length - 1]);
    else startNewConversation();
  }
})();
