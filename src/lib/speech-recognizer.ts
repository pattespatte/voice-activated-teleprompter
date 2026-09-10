type SubscriberFunction = (
  final_transcript: string,
  interim_transcript: string,
) => void

export default class SpeechRecognizer {
  private recognizer: SpeechRecognition | null = null
  private subscribers: SubscriberFunction[] = []
  private shouldListen: Boolean = false

  constructor(language: string = "en-US") {
    // Feature-detect the Web Speech API: constructing the recognizer throws
    // a ReferenceError in browsers that do not implement it (e.g. Firefox).
    const SpeechRecognitionCtor: typeof SpeechRecognition | undefined =
      typeof SpeechRecognition !== "undefined"
        ? SpeechRecognition
        : typeof webkitSpeechRecognition !== "undefined"
          ? webkitSpeechRecognition
          : undefined

    if (SpeechRecognitionCtor === undefined) {
      return
    }

    const recognizer = new SpeechRecognitionCtor()
    this.recognizer = recognizer

    recognizer.lang = language
    recognizer.continuous = true
    recognizer.interimResults = true

    recognizer.onresult = e => {
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

      for (let subscriber of this.subscribers) {
        subscriber(final_transcript, interim_transcript)
      }
    }

    recognizer.onend = () => {
      if (this.shouldListen) {
        recognizer.start()
      }
    }
  }

  start(): void {
    if (this.recognizer === null) {
      return
    }
    this.shouldListen = true
    this.recognizer.start()
  }

  stop(): void {
    if (this.recognizer === null) {
      return
    }
    this.shouldListen = false
    this.recognizer.stop()
  }

  onresult(subscriber: SubscriberFunction): void {
    this.subscribers.push(subscriber)
  }

  setLanguage(language: string): void {
    if (this.recognizer === null) {
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
    return this.recognizer !== null
  }
}
