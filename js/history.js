/**
 * MyYaza Chat History Persistence & Session Manager
 */
class HistoryManager {
  constructor() {
    this.STORAGE_KEY_SESSIONS = MyYazaConfig.STORAGE_KEYS.CHAT_SESSIONS;
    this.STORAGE_KEY_ACTIVE = MyYazaConfig.STORAGE_KEYS.CURRENT_SESSION_ID;
  }

  getSessions() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_SESSIONS);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to parse chat sessions:', e);
      return {};
    }
  }

  saveSessions(sessions) {
    try {
      localStorage.setItem(this.STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Storage quota exceeded:', e);
    }
  }

  getActiveSessionId() {
    return localStorage.getItem(this.STORAGE_KEY_ACTIVE);
  }

  setActiveSessionId(id) {
    localStorage.setItem(this.STORAGE_KEY_ACTIVE, id);
  }

  createSession(providerId = 'chatgpt') {
    const id = 'sess_' + Date.now();
    const newSession = {
      id: id,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      providerId: providerId,
      messages: []
    };

    const sessions = this.getSessions();
    sessions[id] = newSession;
    this.saveSessions(sessions);
    this.setActiveSessionId(id);
    return newSession;
  }

  getSession(id) {
    const sessions = this.getSessions();
    return sessions[id] || null;
  }

  addMessage(sessionId, role, content, providerId, isError = false) {
    const sessions = this.getSessions();
    const session = sessions[sessionId];
    if (!session) return null;

    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      role: role,
      content: content,
      timestamp: Date.now(),
      provider: providerId,
      isError: isError
    };

    session.messages.push(msg);
    session.updatedAt = Date.now();

    // Auto title from first user prompt
    if (role === 'user' && (session.title === 'New Conversation' || !session.title)) {
      session.title = content.slice(0, 32).trim() + (content.length > 32 ? '...' : '');
    }

    this.saveSessions(sessions);
    return msg;
  }

  deleteSession(id) {
    const sessions = this.getSessions();
    delete sessions[id];
    this.saveSessions(sessions);
  }

  clearAll() {
    localStorage.removeItem(this.STORAGE_KEY_SESSIONS);
    localStorage.removeItem(this.STORAGE_KEY_ACTIVE);
  }

  exportAsMarkdown(session) {
    if (!session || !session.messages.length) return null;

    let md = `# ${session.title}\n*Exported from MyYaza on ${new Date().toLocaleString()}*\n\n---\n\n`;
    session.messages.forEach(m => {
      const roleName = m.role === 'user' ? 'You' : (MyYazaConfig.PROVIDERS[m.provider]?.name || 'MyYaza');
      md += `### ${roleName} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n\n`;
    });
    return md;
  }
}

window.HistoryManager = HistoryManager;
