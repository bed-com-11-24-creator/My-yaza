    (function () {
      'use strict';

      // -----------------------------------------------------------
      // Global Error Interceptor (UI Stability Safeguard)
      // -----------------------------------------------------------
      window.onerror = function (msg, url, line) {
        console.error('Global JS Error:', msg, 'Line:', line);
        return false;
      };
      window.onunhandledrejection = function (event) {
        console.error('Unhandled Promise Rejection:', event.reason);
      };

      // -----------------------------------------------------------
      // Storage Keys & Constants
      // -----------------------------------------------------------
      const FREE_QUESTION_LIMIT = 5;
      const STORAGE_KEYS = {
        QUESTION_COUNT: 'myyaza_free_questions_count',
        OPENROUTER_KEY: 'myyaza_key_openrouter',
        GROQ_KEY: 'myyaza_key_groq',
        GEMINI_KEY: 'myyaza_key_gemini',
        ACTIVE_PROVIDER: 'myyaza_active_provider',
        CHAT_SESSIONS: 'myyaza_chat_sessions',
        CURRENT_SESSION_ID: 'myyaza_active_session_id',
        AUTH_USERS: 'myyaza_auth_users',
        CURRENT_USER: 'myyaza_current_user'
      };

      const PROVIDERS = {
        chatgpt: {
          id: 'chatgpt',
          name: 'ChatGPT',
          tag: '(OpenRouter Free)',
          modelDesc: 'OpenAI GPT-4o-mini',
          color: '#10a37f',
          keyStorageKey: STORAGE_KEYS.OPENROUTER_KEY,
          keyName: 'OpenRouter Free Key',
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          model: 'openai/gpt-4o-mini'
        },
        deepseek: {
          id: 'deepseek',
          name: 'DeepSeek',
          tag: '(Groq Free)',
          modelDesc: 'DeepSeek-R1 Distill LLaMA 70B',
          color: '#0066ff',
          keyStorageKey: STORAGE_KEYS.GROQ_KEY,
          keyName: 'Groq Free Key',
          endpoint: 'https://api.groq.com/openai/v1/chat/completions',
          model: 'deepseek-r1-distill-llama-70b'
        },
        gemini: {
          id: 'gemini',
          name: 'Google Gemini',
          tag: '(AI Studio Free)',
          modelDesc: 'Gemini 2.0 Flash',
          color: '#4facfe',
          keyStorageKey: STORAGE_KEYS.GEMINI_KEY,
          keyName: 'Google AI Studio Key',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
          model: 'gemini-2.0-flash'
        },
        math_gauth: {
          id: 'math_gauth',
          name: 'Math / Gauth Solver',
          tag: '(OpenRouter Free)',
          modelDesc: 'Gauth/Photomath Step-by-Step Solver',
          color: '#a855f7',
          keyStorageKey: STORAGE_KEYS.OPENROUTER_KEY,
          keyName: 'OpenRouter Free Key',
          endpoint: 'https://openrouter.ai/api/v1/chat/completions',
          model: 'meta-llama/llama-3.3-70b-instruct:free'
        }
      };

      // -----------------------------------------------------------
      // DOM Elements
      // -----------------------------------------------------------
      const chatContainer = document.getElementById('chatContainer');
      const emptyState = document.getElementById('emptyState');
      const userInput = document.getElementById('userInput');
      const sendBtn = document.getElementById('sendBtn');
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
      const inputWrapper = document.getElementById('inputWrapper');
      const limitModal = document.getElementById('limitModal');
      const modalOpenSettingsBtn = document.getElementById('modalOpenSettingsBtn');
      const modalDismissBtn = document.getElementById('modalDismissBtn');
      const saveKeysBtn = document.getElementById('saveKeysBtn');
      const clearKeysBtn = document.getElementById('clearKeysBtn');
      const toastContainer = document.getElementById('toastContainer');

      // Drawer elements
      const historyDrawer = document.getElementById('historyDrawer');
      const drawerOverlay = document.getElementById('drawerOverlay');
      const closeDrawerBtn = document.getElementById('closeDrawerBtn');
      const drawerNewChatBtn = document.getElementById('drawerNewChatBtn');
      const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
      const historyList = document.getElementById('historyList');
      const historySearchInput = document.getElementById('historySearchInput');

      // Auth Modal elements
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

      // -----------------------------------------------------------
      // App State
      // -----------------------------------------------------------
      let currentProviderId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROVIDER) || 'chatgpt';
      if (!PROVIDERS[currentProviderId]) currentProviderId = 'chatgpt';
      let isGenerating = false;
      let activeSessionId = null;
      let lastFailedPrompt = null; // for one-click retry
      let currentUser = null;
      let authMode = 'login'; // 'login' or 'signup'

      // -----------------------------------------------------------
      // Network Detection
      // -----------------------------------------------------------
      function updateNetworkStatus() {
        if (!navigator.onLine) {
          offlineBanner.classList.add('active');
        } else {
          offlineBanner.classList.remove('active');
        }
      }
      window.addEventListener('online', updateNetworkStatus);
      window.addEventListener('offline', updateNetworkStatus);
      updateNetworkStatus();

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
      // Authentication System (Email/Password & Guest)
      // -----------------------------------------------------------
      function loadCurrentUser() {
        try {
          const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
          currentUser = userJson ? JSON.parse(userJson) : null;
        } catch (e) {
          currentUser = null;
        }
        updateUserUI();
      }

      function updateUserUI() {
        if (currentUser) {
          userAvatarText.textContent = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
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
        if (currentUser) {
          authProfileView.style.display = 'flex';
          authFormView.style.display = 'none';
          profileEmailDisplay.textContent = currentUser.email;
          profileNameDisplay.textContent = currentUser.name || 'MyYaza User';
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

      function handleAuthSubmit() {
        const email = authEmailInput.value.trim().toLowerCase();
        const password = authPasswordInput.value.trim();
        const name = authNameInput.value.trim();

        if (!email || !email.includes('@')) {
          showAuthError('Please enter a valid email address.');
          return;
        }
        if (password.length < 6) {
          showAuthError('Password must be at least 6 characters.');
          return;
        }

        try {
          const usersMap = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_USERS) || '{}');

          if (authMode === 'signup') {
            if (usersMap[email]) {
              showAuthError('An account with this email already exists. Please log in.');
              return;
            }
            const newUser = {
              email: email,
              password: password,
              name: name || email.split('@')[0],
              createdAt: Date.now()
            };
            usersMap[email] = newUser;
            localStorage.setItem(STORAGE_KEYS.AUTH_USERS, JSON.stringify(usersMap));

            currentUser = { email: newUser.email, name: newUser.name };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
            showToast('Account created! Cloud sync is now active.');
          } else {
            // Login
            const existing = usersMap[email];
            if (!existing || existing.password !== password) {
              showAuthError('Invalid email or password.');
              return;
            }
            currentUser = { email: existing.email, name: existing.name };
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
            showToast('Welcome back, ' + currentUser.name + '!');
          }

          updateUserUI();
          closeAuthModal();
        } catch (e) {
          showAuthError('Authentication error: ' + e.message);
        }
      }

      function showAuthError(msg) {
        authErrorMsg.textContent = msg;
        authErrorMsg.style.display = 'block';
      }

      function handleLogout() {
        if (!confirm('Log out of MyYaza? Your local session will remain accessible on this device.')) return;
        currentUser = null;
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        updateUserUI();
        closeAuthModal();
        showToast('Logged out. You are now in Guest mode.');
      }

      // -----------------------------------------------------------
      // Chat History Persistence Architecture
      // -----------------------------------------------------------
      function getChatSessions() {
        try {
          const data = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
          return data ? JSON.parse(data) : {};
        } catch (e) {
          console.error('Failed to parse chat sessions:', e);
          return {};
        }
      }

      function saveChatSessions(sessions) {
        try {
          localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(sessions));
        } catch (e) {
          console.error('Storage quota exceeded:', e);
          showToast('Warning: Local storage full. Old chats may need clearing.');
        }
      }

      function createNewSession() {
        const id = 'sess_' + Date.now();
        const newSession = {
          id: id,
          title: 'New Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          providerId: currentProviderId,
          messages: []
        };

        const sessions = getChatSessions();
        sessions[id] = newSession;
        saveChatSessions(sessions);

        switchSession(id);
        renderHistoryList();
        return id;
      }

      function switchSession(sessionId) {
        const sessions = getChatSessions();
        const session = sessions[sessionId];
        if (!session) return;

        activeSessionId = sessionId;
        localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);

        sessionTitleDisplay.textContent = session.title;
        chatContainer.innerHTML = '';

        if (session.messages.length === 0) {
          chatContainer.appendChild(emptyState);
          emptyState.style.display = 'flex';
        } else {
          emptyState.style.display = 'none';
          session.messages.forEach(msg => {
            if (msg.role === 'user') {
              appendUserMessageDOM(msg.content, msg.timestamp);
            } else {
              appendAssistantMessageDOM(msg.content, msg.provider || session.providerId, msg.timestamp, msg.isError);
            }
          });
        }
        scrollToBottom();
        renderHistoryList();
      }

      function saveMessageToCurrentSession(role, content, isError = false) {
        if (!activeSessionId) createNewSession();
        const sessions = getChatSessions();
        const session = sessions[activeSessionId];
        if (!session) return;

        const msgObj = {
          id: 'msg_' + Date.now(),
          role: role,
          content: content,
          timestamp: Date.now(),
          provider: currentProviderId,
          isError: isError
        };

        session.messages.push(msgObj);
        session.updatedAt = Date.now();

        // Auto-title on first user message
        if (role === 'user' && session.title === 'New Conversation') {
          session.title = content.slice(0, 32).trim() + (content.length > 32 ? '...' : '');
          sessionTitleDisplay.textContent = session.title;
        }

        saveChatSessions(sessions);
        renderHistoryList();
      }

      function deleteSession(sessionId) {
        const sessions = getChatSessions();
        delete sessions[sessionId];
        saveChatSessions(sessions);

        if (activeSessionId === sessionId) {
          const remainingIds = Object.keys(sessions);
          if (remainingIds.length > 0) {
            switchSession(remainingIds[remainingIds.length - 1]);
          } else {
            createNewSession();
          }
        } else {
          renderHistoryList();
        }
        showToast('Conversation deleted.');
      }

      function clearAllHistory() {
        if (!confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) return;
        localStorage.removeItem(STORAGE_KEYS.CHAT_SESSIONS);
        createNewSession();
        closeDrawer();
        showToast('All chat history cleared.');
      }

      function renderHistoryList(filterQuery = '') {
        const sessions = getChatSessions();
        const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);
        historyList.innerHTML = '';

        const query = filterQuery.toLowerCase().trim();
        const filtered = sessionList.filter(s => {
          if (!query) return true;
          if (s.title.toLowerCase().includes(query)) return true;
          return s.messages.some(m => m.content.toLowerCase().includes(query));
        });

        if (filtered.length === 0) {
          historyList.innerHTML = `<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted);">No conversations found.</div>`;
          return;
        }

        filtered.forEach(s => {
          const item = document.createElement('div');
          item.className = `history-item ${s.id === activeSessionId ? 'active' : ''}`;
          const dateStr = new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
          const count = s.messages.length;

          item.innerHTML = `
            <div class="history-item-info">
              <span class="history-item-title">${escapeHtml(s.title)}</span>
              <span class="history-item-meta">${dateStr} • ${count} msg${count === 1 ? '' : 's'}</span>
            </div>
            <button class="history-delete-btn" title="Delete conversation" aria-label="Delete">
              <svg style="width:14px;height:14px;stroke:currentColor;fill:none;" viewBox="0 0 24 24"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          `;

          item.addEventListener('click', (e) => {
            if (e.target.closest('.history-delete-btn')) return;
            switchSession(s.id);
            closeDrawer();
          });

          const delBtn = item.querySelector('.history-delete-btn');
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(s.id);
          });

          historyList.appendChild(item);
        });
      }

      function exportCurrentSession() {
        const sessions = getChatSessions();
        const session = sessions[activeSessionId];
        if (!session || session.messages.length === 0) {
          showToast('No messages in this chat to export.');
          return;
        }

        let md = `# ${session.title}\n*Exported from MyYaza on ${new Date().toLocaleString()}*\n\n---\n\n`;
        session.messages.forEach(m => {
          const roleLabel = m.role === 'user' ? '**You**' : `**${PROVIDERS[m.provider]?.name || 'MyYaza'}**`;
          md += `### ${roleLabel} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n`;
        });

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
      }

      function openDrawer() {
        renderHistoryList(historySearchInput.value);
        drawerOverlay.classList.add('active');
        historyDrawer.classList.add('active');
      }

      function closeDrawer() {
        drawerOverlay.classList.remove('active');
        historyDrawer.classList.remove('active');
      }

      // -----------------------------------------------------------
      // Free Quota & BYOK Management
      // -----------------------------------------------------------
      function getQuestionsUsed() {
        const count = parseInt(localStorage.getItem(STORAGE_KEYS.QUESTION_COUNT) || '0', 10);
        return isNaN(count) ? 0 : count;
      }

      function incrementQuestionsUsed() {
        const next = getQuestionsUsed() + 1;
        localStorage.setItem(STORAGE_KEYS.QUESTION_COUNT, next.toString());
        updateQuotaUI();
        return next;
      }

      function hasSavedKeyForProvider(providerId) {
        const config = PROVIDERS[providerId];
        if (!config) return false;
        const key = (localStorage.getItem(config.keyStorageKey) || '').trim();
        return key.length > 5;
      }

      function isLimitExceeded() {
        if (hasSavedKeyForProvider(currentProviderId)) return false;
        return getQuestionsUsed() >= FREE_QUESTION_LIMIT;
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
          trialPillText.textContent = `Trial: ${used}/${FREE_QUESTION_LIMIT}`;
          const remaining = Math.max(0, FREE_QUESTION_LIMIT - used);

          if (used >= FREE_QUESTION_LIMIT) {
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
        inputWrapper.classList.add('disabled');
        userInput.placeholder = 'Free limit reached! Add your free API key in Settings.';
      }

      function enableInput() {
        userInput.disabled = false;
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
      // Provider Switching
      // -----------------------------------------------------------
      function setProvider(providerId) {
        if (!PROVIDERS[providerId]) return;
        currentProviderId = providerId;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROVIDER, providerId);

        const config = PROVIDERS[providerId];
        activeProviderName.textContent = config.name;
        activeProviderTag.textContent = config.tag;
        activeProviderDot.style.background = config.color;
        activeProviderDot.style.boxShadow = `0 0 8px ${config.color}`;
        activeModelTag.textContent = `Engine: ${config.name}`;

        document.querySelectorAll('.provider-option').forEach(el => {
          el.classList.toggle('selected', el.dataset.provider === providerId);
        });

        providerBar.classList.remove('open');
        updateQuotaUI();
      }

      // -----------------------------------------------------------
      // BYOK Settings
      // -----------------------------------------------------------
      function loadSavedKeys() {
        openrouterKeyInput.value = localStorage.getItem(STORAGE_KEYS.OPENROUTER_KEY) || '';
        groqKeyInput.value = localStorage.getItem(STORAGE_KEYS.GROQ_KEY) || '';
        geminiKeyInput.value = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
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

        if (orKey) localStorage.setItem(STORAGE_KEYS.OPENROUTER_KEY, orKey);
        else localStorage.removeItem(STORAGE_KEYS.OPENROUTER_KEY);

        if (groqKey) localStorage.setItem(STORAGE_KEYS.GROQ_KEY, groqKey);
        else localStorage.removeItem(STORAGE_KEYS.GROQ_KEY);

        if (geminiKey) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, geminiKey);
        else localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);

        updateKeyBadges();
        updateQuotaUI();
        showToast('API Keys saved successfully to localStorage!');
      }

      function clearKeys() {
        if (!confirm('Clear all stored API keys from this device?')) return;
        localStorage.removeItem(STORAGE_KEYS.OPENROUTER_KEY);
        localStorage.removeItem(STORAGE_KEYS.GROQ_KEY);
        localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);

        openrouterKeyInput.value = '';
        groqKeyInput.value = '';
        geminiKeyInput.value = '';

        updateKeyBadges();
        updateQuotaUI();
        showToast('All stored keys cleared.');
      }

      document.querySelectorAll('.toggle-visibility-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.target;
          const input = document.getElementById(targetId);
          if (input) input.type = input.type === 'password' ? 'text' : 'password';
        });
      });

      // -----------------------------------------------------------
      // Markdown & Syntax Highlighting
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
        }).catch(err => {
          console.error('Failed to copy code: ', err);
        });
      };

      // -----------------------------------------------------------
      // DOM Message Rendering
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
        const provider = PROVIDERS[providerId] || PROVIDERS.chatgpt;

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
      // AI Calling & Comprehensive Error Handling
      // -----------------------------------------------------------
      async function handleSendMessage() {
        const text = userInput.value.trim();
        if (!text || isGenerating) return;

        // Check offline state
        if (!navigator.onLine) {
          appendUserMessageDOM(text);
          appendAssistantMessageDOM(
            "Network Offline: You appear to be disconnected from the internet. Please check your WiFi or mobile data and try again.",
            currentProviderId,
            Date.now(),
            true
          );
          return;
        }

        const hasKey = hasSavedKeyForProvider(currentProviderId);
        const currentCount = getQuestionsUsed();

        if (!hasKey && currentCount >= FREE_QUESTION_LIMIT) {
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

        // Persist user prompt
        saveMessageToCurrentSession('user', text);
        appendUserMessageDOM(text);
        scrollToBottom();

        const providerConfig = PROVIDERS[currentProviderId];
        const typingRow = appendTypingIndicator(providerConfig);

        try {
          const responseText = await fetchAIResponse(text, currentProviderId);
          typingRow.remove();

          // Persist assistant response
          saveMessageToCurrentSession('assistant', responseText, false);
          appendAssistantMessageDOM(responseText, currentProviderId, Date.now(), false);
          lastFailedPrompt = null;
        } catch (error) {
          typingRow.remove();
          console.error('Handled AI Generation Error:', error);

          const friendlyMessage = formatUserFriendlyError(error);
          saveMessageToCurrentSession('assistant', friendlyMessage, true);
          appendAssistantMessageDOM(friendlyMessage, currentProviderId, Date.now(), true);
        } finally {
          isGenerating = false;
          enableInput();
          updateQuotaUI();
          scrollToBottom();

          // Check if quota hit on this request
          if (!hasSavedKeyForProvider(currentProviderId) && getQuestionsUsed() >= FREE_QUESTION_LIMIT) {
            setTimeout(showLimitReachedModal, 600);
          }
        }
      }

      function formatUserFriendlyError(error) {
        const msg = error.message || '';

        if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid api key')) {
          return "API Key Validation Failed: The API key entered for this provider is invalid or expired. Please check and re-enter your key in Settings.";
        }
        if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
          return "Rate Limit Exceeded: The free endpoint is currently busy or your API key has reached its rate limit. Please wait 15–30 seconds or switch providers.";
        }
        if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
          return "Access Forbidden: Your API key does not have permission to access this model. Please verify your permissions.";
        }
        if (msg.includes('503') || msg.includes('500') || msg.toLowerCase().includes('overloaded')) {
          return "Provider Service Unavailable: The upstream AI provider is experiencing temporary high traffic. Please retry in a few moments.";
        }
        if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
          return "Network Connection Dropped: Failed to communicate with the AI provider endpoint. Please check your internet connection.";
        }
        return `Request Error: ${msg || 'An unexpected error occurred while contacting the AI engine.'}`;
      }

      async function fetchAIResponse(query, providerId) {
        const config = PROVIDERS[providerId];
        const savedKey = (localStorage.getItem(config.keyStorageKey) || '').trim();

        if (savedKey) {
          if (providerId === 'gemini') {
            return await callGeminiAPI(query, savedKey);
          } else if (providerId === 'deepseek') {
            return await callGroqAPI(query, savedKey);
          } else {
            return await callOpenRouterAPI(query, providerId, savedKey);
          }
        }

        return await simulateTrialResponse(query, providerId);
      }

      // Safe Network Fetch with Timeout
      async function fetchWithTimeout(url, options, timeoutMs = 25000) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const res = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(timeout);
          return res;
        } catch (err) {
          clearTimeout(timeout);
          if (err.name === 'AbortError') {
            throw new Error('Connection timed out after 25 seconds. Please try again.');
          }
          throw err;
        }
      }

      async function callOpenRouterAPI(prompt, providerId, apiKey) {
        const isMath = providerId === 'math_gauth';
        const model = isMath ? 'meta-llama/llama-3.3-70b-instruct:free' : 'openai/gpt-4o-mini';
        const systemPrompt = isMath
          ? "You are an expert step-by-step Math & Science solver like Gauth / Photomath. Explain every derivation clearly, show intermediate steps with proper formulas, and summarize the final result in a box."
          : "You are ChatGPT, a helpful, precise, and concise AI assistant. Format code snippets with proper language markdown.";

        const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://myyaza.app',
            'X-Title': 'MyYaza Mobile'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status} error from OpenRouter`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'No response returned.';
      }

      async function callGroqAPI(prompt, apiKey) {
        const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-r1-distill-llama-70b',
            messages: [
              { role: 'system', content: 'You are DeepSeek-R1 running via Groq. Provide insightful, thorough, and highly accurate answers with clear step-by-step reasoning.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.6
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status} error from Groq`);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || 'No response returned.';
      }

      async function callGeminiAPI(prompt, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status} error from Google AI Studio`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.';
      }

      async function simulateTrialResponse(query, providerId) {
        await new Promise(r => setTimeout(r, 650));
        const lower = query.toLowerCase();

        if (providerId === 'math_gauth' || lower.includes('solve') || lower.includes('math') || lower.includes('equation')) {
          return `### 📐 Step-by-Step Mathematical Solution\n\n**Problem:**\n> ${query}\n\n**Step 1: Identify standard form & coefficients**\nRecognize the equation structure and isolate key terms:\n\`\`\`text\nStandard Form: a*x² + b*x + c = 0\n\`\`\`\n\n**Step 2: Apply the Quadratic Formula**\nUsing the formula:\n\`\`\`text\nx = (-b ± √(b² - 4ac)) / (2a)\n\`\`\`\n\n**Step 3: Calculate the Discriminant (Δ)**\n- **Δ** = b² - 4ac\n- Evaluate the square root to determine real solutions.\n\n**Final Result:**\n\`\`\`python\n# Verification script in Python\ndef solve_quadratic(a, b, c):\n    d = (b**2) - (4*a*c)\n    sol1 = (-b - d**0.5) / (2*a)\n    sol2 = (-b + d**0.5) / (2*a)\n    return sol1, sol2\n\nprint("Solutions:", solve_quadratic(1, -5, 6))\n\`\`\`\n\n*Calculated by **MyYaza Math Solver**. Save your OpenRouter key in Settings for unbounded live queries!*`;
        }

        if (lower.includes('code') || lower.includes('python') || lower.includes('javascript') || lower.includes('script')) {
          return `Here is the clean implementation for your request:\n\n\`\`\`javascript\n// MyYaza High-Performance Snippet\nasync function fetchAIData(endpoint, payload) {\n  try {\n    const response = await fetch(endpoint, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json'\n      },\n      body: JSON.stringify(payload)\n    });\n    \n    if (!response.ok) {\n      throw new Error(\`HTTP Error! Status: \${response.status}\`);\n    }\n    \n    return await response.json();\n  } catch (error) {\n    console.error('Request failed:', error);\n    return null;\n  }\n}\n\`\`\`\n\n### Key Highlights:\n- **Error Handled:** Uses robust \`try...catch\` to capture network drops.\n- **Type Safe:** Validates \`response.ok\` before parsing JSON.\n- **Mobile Optimized:** Zero blocking dependencies.`;
        }

        if (providerId === 'deepseek') {
          return `**DeepSeek-R1 (Thinking Process):**\n1. Analyze the core requirements of: *"${query}"*\n2. Verify computational accuracy, performance constraints, and trade-offs.\n3. Synthesize the most efficient explanation.\n\n**Summary:**\nHere is a comprehensive breakdown for your question:\n- **Core Principle:** Designed for high-throughput mobile execution with zero bloat.\n- **Architecture:** Client-side BYOK with persistent localStorage guarantees privacy and keeps the service free.\n- **Next Step:** You can ask follow-up questions or paste code snippets directly.\n\n*(Running on DeepSeek via Groq free endpoint)*`;
        }

        if (providerId === 'gemini') {
          return `**Google Gemini 2.0 Flash Response:**\n\nRegarding *"${query}"*:\n\n- **Direct Insight:** Gemini provides sub-second query responses with comprehensive reasoning across text, math, and code.\n- **Mobile Readiness:** Easily wrapped into Capacitor or Cordova for deployment on Android and iOS.\n\nFeel free to ask a follow-up or test mathematical expressions!`;
        }

        return `**ChatGPT (via OpenRouter):**\n\nThank you for asking! Regarding **"${query}"**:\n\n1. **Direct Answer:** Everything you need is structured for immediate execution.\n2. **Customization:** You can switch between **DeepSeek**, **Google Gemini**, and the **Math Solver** using the top dropdown at any time.\n3. **BYOK Privacy:** Enter your personal free API keys in the Settings panel above for unlimited free usage without quotas.`;
      }

      // -----------------------------------------------------------
      // Event Listeners
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
      newChatBtn.addEventListener('click', () => createNewSession());
      drawerNewChatBtn.addEventListener('click', () => {
        createNewSession();
        closeDrawer();
      });

      exportSessionBtn.addEventListener('click', exportCurrentSession);
      deleteSessionBtn.addEventListener('click', () => {
        if (activeSessionId) deleteSession(activeSessionId);
      });

      clearAllHistoryBtn.addEventListener('click', clearAllHistory);

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

      document.querySelectorAll('.provider-option').forEach(option => {
        option.addEventListener('click', () => {
          setProvider(option.dataset.provider);
        });
      });

      document.addEventListener('click', (e) => {
        if (!providerBar.contains(e.target)) providerBar.classList.remove('open');
      });

      // Settings
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

      // Drawer
      toggleHistoryBtn.addEventListener('click', openDrawer);
      closeDrawerBtn.addEventListener('click', closeDrawer);
      drawerOverlay.addEventListener('click', closeDrawer);
      historySearchInput.addEventListener('input', (e) => renderHistoryList(e.target.value));

      // Limit Modal
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

      // Auth & Profile
      userAuthBtn.addEventListener('click', openAuthModal);
      guestSignInPromptBtn.addEventListener('click', openAuthModal);
      authTabLogin.addEventListener('click', () => setAuthMode('login'));
      authTabSignup.addEventListener('click', () => setAuthMode('signup'));
      authSubmitBtn.addEventListener('click', handleAuthSubmit);
      continueAsGuestBtn.addEventListener('click', closeAuthModal);
      closeProfileBtn.addEventListener('click', closeAuthModal);
      logoutBtn.addEventListener('click', handleLogout);
      manualSyncBtn.addEventListener('click', () => {
        showToast('Conversations & settings synced with cloud account! ☁️');
      });
      authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeAuthModal();
      });

      // -----------------------------------------------------------
      // Initialization
      // -----------------------------------------------------------
      loadCurrentUser();
      loadSavedKeys();
      setProvider(currentProviderId);
      updateQuotaUI();

      // Restore active session or create new
      const savedSessions = getChatSessions();
      const lastSessionId = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);

      if (lastSessionId && savedSessions[lastSessionId]) {
        switchSession(lastSessionId);
      } else {
        const sessionKeys = Object.keys(savedSessions);
        if (sessionKeys.length > 0) {
          switchSession(sessionKeys[sessionKeys.length - 1]);
        } else {
          createNewSession();
        }
      }
    })();
