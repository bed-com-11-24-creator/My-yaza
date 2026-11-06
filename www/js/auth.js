/**
 * MyYaza Authentication & User Profile Management
 */
class AuthManager {
  constructor() {
    this.STORAGE_KEY_USERS = MyYazaConfig.STORAGE_KEYS.AUTH_USERS;
    this.STORAGE_KEY_CURRENT = MyYazaConfig.STORAGE_KEYS.CURRENT_USER;
    this.currentUser = this.loadCurrentUser();
  }

  loadCurrentUser() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_CURRENT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  signUp(name, email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (cleanPass.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const users = this.getUsersMap();
    if (users[cleanEmail]) {
      throw new Error('An account with this email already exists. Please log in.');
    }

    const newUser = {
      email: cleanEmail,
      password: cleanPass,
      name: cleanName,
      createdAt: Date.now()
    };

    users[cleanEmail] = newUser;
    localStorage.setItem(this.STORAGE_KEY_USERS, JSON.stringify(users));

    this.currentUser = { email: newUser.email, name: newUser.name };
    localStorage.setItem(this.STORAGE_KEY_CURRENT, JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  logIn(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    const users = this.getUsersMap();
    const existing = users[cleanEmail];

    if (!existing || existing.password !== cleanPass) {
      throw new Error('Invalid email or password.');
    }

    this.currentUser = { email: existing.email, name: existing.name };
    localStorage.setItem(this.STORAGE_KEY_CURRENT, JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  logOut() {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEY_CURRENT);
  }

  getUsersMap() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY_USERS) || '{}');
    } catch (e) {
      return {};
    }
  }
}

window.AuthManager = AuthManager;
