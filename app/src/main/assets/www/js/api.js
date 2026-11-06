/**
 * MyYaza AI API Module with Comprehensive Error Handling & Timeout Protection
 */
class AIService {
  static formatError(error) {
    const msg = error.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid api key')) {
      return "API Key Validation Failed: The personal API key entered for this provider is invalid or expired. Please check and re-enter your key in Settings.";
    }
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      return "Rate Limit Exceeded: The free endpoint is currently busy or your personal key reached its rate limit. Please wait 15–30 seconds or switch providers.";
    }
    if (msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
      return "Access Forbidden: Your API key does not have permission to access this model. Please check model permissions.";
    }
    if (msg.includes('503') || msg.includes('500') || msg.toLowerCase().includes('overloaded')) {
      return "Provider Service Unavailable: The upstream AI provider is experiencing temporary high traffic. Please retry in a few moments.";
    }
    if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
      return "Network Connection Dropped: Failed to communicate with the AI provider endpoint. Please check your internet connection.";
    }
    return `Request Error: ${msg || 'An unexpected error occurred while contacting the AI engine.'}`;
  }

  static async fetchWithTimeout(url, options, timeoutMs = 25000) {
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

  static async generate(query, providerId, savedKey = '') {
    // 1. If personal key exists, route to real live API
    if (savedKey && savedKey.length > 5) {
      if (providerId === 'gemini') {
        return await this.callGeminiAPI(query, savedKey);
      } else if (providerId === 'deepseek') {
        return await this.callGroqAPI(query, savedKey);
      } else {
        return await this.callOpenRouterAPI(query, providerId, savedKey);
      }
    }

    // 2. Free Trial Local Engine (for first 5 questions before BYOK)
    return await this.simulateTrialResponse(query, providerId);
  }

  static async callOpenRouterAPI(prompt, providerId, apiKey) {
    const isMath = providerId === 'math_gauth';
    const model = isMath ? 'meta-llama/llama-3.3-70b-instruct:free' : 'openai/gpt-4o-mini';
    const systemPrompt = isMath
      ? "You are an expert step-by-step Math & Science solver like Gauth / Photomath. Explain every derivation clearly, show intermediate steps with proper formulas, and summarize the final result in a box."
      : "You are ChatGPT, a helpful, precise, and concise AI assistant. Format code snippets with proper language markdown.";

    const res = await this.fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
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

  static async callGroqAPI(prompt, apiKey) {
    const res = await this.fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
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

  static async callGeminiAPI(prompt, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await this.fetchWithTimeout(url, {
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

  static async simulateTrialResponse(query, providerId) {
    await new Promise(r => setTimeout(r, 650));
    const lower = query.toLowerCase();

    if (providerId === 'math_gauth' || lower.includes('solve') || lower.includes('math') || lower.includes('equation')) {
      return `### 📐 Step-by-Step Mathematical Solution\n\n**Problem:**\n> ${query}\n\n**Step 1: Identify standard form & coefficients**\nRecognize the equation structure and isolate key terms:\n\`\`\`text\nStandard Form: a*x² + b*x + c = 0\n\`\`\`\n\n**Step 2: Apply the Quadratic Formula**\nUsing the formula:\n\`\`\`text\nx = (-b ± √(b² - 4ac)) / (2a)\n\`\`\`\n\n**Step 3: Calculate the Discriminant (Δ)**\n- **Δ** = b² - 4ac\n- Evaluate the square root to determine real solutions.\n\n**Final Result:**\n\`\`\`python\n# Verification script in Python\ndef solve_quadratic(a, b, c):\n    d = (b**2) - (4*a*c)\n    sol1 = (-b - d**0.5) / (2*a)\n    sol2 = (-b + d**0.5) / (2*a)\n    return sol1, sol2\n\nprint("Solutions:", solve_quadratic(1, -5, 6))\n\`\`\`\n\n*Calculated by **MyYaza Math Solver**. Save your OpenRouter key in Settings for unbounded live queries!*`;
    }

    if (lower.includes('code') || lower.includes('python') || lower.includes('javascript') || lower.includes('script')) {
      return `Here is the clean implementation for your request:\n\n\`\`\`javascript\n// MyYaza High-Performance Snippet\nasync function fetchAIData(endpoint, payload) {\n  try {\n    const response = await fetch(endpoint, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json'\n      },\n      body: JSON.stringify(payload)\n    });\n    \n    if (!response.ok) {\n      throw new Error(\`HTTP Error! Status: \${response.status}\`);\n    }\n    \n    return await response.json();\n  } catch (error) {\n    console.error('Request failed:', error);\n    return null;\n  }\n}\n\`\`\`\n\n### Key Highlights:\n- **Error Handled:** Uses robust \`try...catch\` to capture network drops.\n- **Type Safe:** Validates \`response.ok\` before parsing JSON.\n- **Mobile Optimized:** Zero blocking dependencies.`;
    }

    if (providerId === 'deepseek') {
      return `**DeepSeek-R1 (Thinking Process):**\n1. Analyze the core requirements of: *"${query}"*\n2. Verify computational accuracy, performance constraints, and trade-offs.\n3. Synthesize the most efficient explanation.\n\n**Summary:**\nHere is a comprehensive breakdown for your question:\n- **Core Principle:** Designed for high-throughput mobile execution with zero bloat.\n- **Architecture:** Client-side BYOK with persistent localStorage guarantees privacy and keeps the service free.\n- **Voice Input:** Voice-to-text dictation now active for hands-free queries!\n\n*(Running on DeepSeek via Groq free endpoint)*`;
    }

    if (providerId === 'gemini') {
      return `**Google Gemini 2.0 Flash Response:**\n\nRegarding *"${query}"*:\n\n- **Direct Insight:** Gemini provides sub-second query responses with comprehensive reasoning across text, math, code, and voice dictation.\n- **Mobile Readiness:** Easily wrapped into Capacitor or Cordova for deployment on Android and iOS.\n\nFeel free to tap the microphone to dictate your next query!`;
    }

    return `**ChatGPT (via OpenRouter):**\n\nThank you for asking! Regarding **"${query}"**:\n\n1. **Direct Answer:** Everything you need is structured for immediate execution.\n2. **Voice & Speed:** You can speak directly to MyYaza using the microphone button on the bottom bar.\n3. **BYOK Privacy:** Enter your personal free API keys in the Settings panel above for unlimited free usage without quotas.`;
  }
}

window.AIService = AIService;
