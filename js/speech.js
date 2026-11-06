/**
 * MyYaza Speech Recognition Module (Web Speech API Voice-to-Text)
 */
class SpeechToTextManager {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
    this.recognition = this.isSupported ? new SpeechRecognition() : null;
    this.isListening = false;
    this.baseText = ''; // Stores text existing in input before speech began

    if (this.isSupported) {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = navigator.language || 'en-US';
      this.recognition.maxAlternatives = 1;
    }
  }

  toggle(callbacks = {}) {
    if (!this.isSupported) {
      if (callbacks.onError) {
        callbacks.onError('Web Speech API is not supported on this browser or platform. Please use keyboard input or Chrome/Android WebView.');
      }
      return;
    }

    if (this.isListening) {
      this.stop();
    } else {
      this.start(callbacks);
    }
  }

  start(callbacks = {}) {
    if (!this.isSupported || this.isListening) return;

    this.onTranscript = callbacks.onTranscript || (() => {});
    this.onStart = callbacks.onStart || (() => {});
    this.onEnd = callbacks.onEnd || (() => {});
    this.onError = callbacks.onError || (() => {});

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStart();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      this.onTranscript({
        final: finalTranscript,
        interim: interimTranscript,
        full: (finalTranscript || interimTranscript).trim()
      });
    };

    this.recognition.onerror = (event) => {
      console.warn('Speech Recognition Error:', event.error);
      let errorMsg = 'Speech recognition error.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMsg = 'Microphone permission denied. Please allow microphone access in your browser or device settings.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please try again.';
      } else if (event.error === 'network') {
        errorMsg = 'Network error during voice recognition.';
      } else if (event.error === 'audio-capture') {
        errorMsg = 'No microphone was found on this device.';
      }
      this.onError(errorMsg);
      this.stop();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onEnd();
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start SpeechRecognition:', err);
      this.isListening = false;
      this.onError('Unable to start microphone: ' + err.message);
      this.onEnd();
    }
  }

  stop() {
    if (!this.isSupported || !this.isListening) return;
    try {
      this.recognition.stop();
    } catch (err) {
      console.error('Error stopping recognition:', err);
    } finally {
      this.isListening = false;
      if (this.onEnd) this.onEnd();
    }
  }
}

window.SpeechToTextManager = SpeechToTextManager;
