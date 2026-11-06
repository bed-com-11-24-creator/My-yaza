/**
 * MyYaza Configuration & Provider Definitions
 */
const MyYazaConfig = {
  FREE_QUESTION_LIMIT: 5,
  STORAGE_KEYS: {
    QUESTION_COUNT: 'myyaza_free_questions_count',
    OPENROUTER_KEY: 'myyaza_key_openrouter',
    GROQ_KEY: 'myyaza_key_groq',
    GEMINI_KEY: 'myyaza_key_gemini',
    ACTIVE_PROVIDER: 'myyaza_active_provider',
    CHAT_SESSIONS: 'myyaza_chat_sessions',
    CURRENT_SESSION_ID: 'myyaza_active_session_id',
    AUTH_USERS: 'myyaza_auth_users',
    CURRENT_USER: 'myyaza_current_user'
  },
  PROVIDERS: {
    chatgpt: {
      id: 'chatgpt',
      name: 'ChatGPT',
      tag: '(OpenRouter Free)',
      modelDesc: 'OpenAI GPT-4o-mini',
      color: '#10a37f',
      keyStorageKey: 'myyaza_key_openrouter',
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
      keyStorageKey: 'myyaza_key_groq',
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
      keyStorageKey: 'myyaza_key_gemini',
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
      keyStorageKey: 'myyaza_key_openrouter',
      keyName: 'OpenRouter Free Key',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      model: 'meta-llama/llama-3.3-70b-instruct:free'
    }
  }
};

window.MyYazaConfig = MyYazaConfig;
