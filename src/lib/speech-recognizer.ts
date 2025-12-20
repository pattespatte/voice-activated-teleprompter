type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

// Type declaration for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechGrammarList {
  length: number;
  addFromString(string: string, weight?: number): void;
  addFromURI(src: string, weight?: number): void;
  item(index: number): SpeechGrammar;
  [index: number]: SpeechGrammar;
}

interface SpeechGrammar {
  src: string;
  weight: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default class SpeechRecognizer {
  private recognizer: SpeechRecognition | null = null
  private subscribers: SubscriberFunction[] = []
  private shouldListen: boolean = false
  private isSupported: boolean = false

  constructor(language: string = "en-US") {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognizer = new (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition()
      this.isSupported = true

      this.recognizer!.lang = language
      this.recognizer!.continuous = true
      this.recognizer!.interimResults = true

      this.recognizer!.onresult = e => {
        let final_transcript = ""
        let interim_transcript = ""

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          const result = e.results[i]
          const transcript = result[0].transcript

          if (result.isFinal) {
            final_transcript += transcript
          } else {
            interim_transcript += transcript
          }
        }

        for (const subscriber of this.subscribers) {
          subscriber(final_transcript, interim_transcript)
        }
      }

      this.recognizer!.onend = () => {
        if (this.shouldListen && this.recognizer) {
          this.recognizer.start()
        }
      }
    }
  }

  start(): void {
    if (!this.isSupported || !this.recognizer) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Speech recognition is not supported in this browser')
      }
      return
    }
    this.shouldListen = true
    this.recognizer.start()
  }

  stop(): void {
    if (!this.isSupported || !this.recognizer) {
      return
    }
    this.shouldListen = false
    this.recognizer.stop()
  }

  onresult(subscriber: SubscriberFunction): void {
    this.subscribers.push(subscriber)
  }

  setLanguage(language: string): void {
    if (!this.isSupported || !this.recognizer) {
      return
    }
    const wasListening = this.shouldListen
    if (wasListening) {
      this.stop()
    }
    this.recognizer.lang = language
    if (wasListening) {
      this.start()
    }
  }

  getIsSupported(): boolean {
    return this.isSupported
  }
}
