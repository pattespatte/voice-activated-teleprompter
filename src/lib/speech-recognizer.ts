type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

export default class SpeechRecognizer {
  private recognizer: SpeechRecognition | null = null
  private subscribers: SubscriberFunction[] = []
  private shouldListen: Boolean = false
  private isSupported: Boolean = false

  constructor(language: string = "en-US") {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognizer = new (window as any).webkitSpeechRecognition()
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
      console.warn('Speech recognition is not supported in this browser')
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

  getIsSupported(): Boolean {
    return this.isSupported
  }
}
