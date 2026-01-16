import type { AppThunk } from "./store"
import { start, stop } from "../features/navbar/navbarSlice"
import {
  setFinalTranscriptIndex,
  setInterimTranscriptIndex,
} from "../features/content/contentSlice"
import SpeechRecognizer from "../lib/speech-recognizer"
import { computeSpeechRecognitionTokenIndex } from "../lib/speech-matcher"

let speechRecognizer: SpeechRecognizer | null = null

export const startTeleprompter = (): AppThunk => (dispatch, getState) => {
  dispatch(start())

  const { language } = getState().navbar
  speechRecognizer = new SpeechRecognizer(language)

  // Check if speech recognition is supported
  if (!speechRecognizer.getIsSupported()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Speech recognition is not supported in this browser. The teleprompter will work in manual mode only.')
    }
    return
  }

  speechRecognizer.onresult(
    (final_transcript: string, interim_transcript: string) => {
      const {
        textElements,
        finalTranscriptIndex: lastFinalTranscriptIndex,
      } = getState().content

      if (final_transcript !== "") {
        const finalTranscriptIndex = computeSpeechRecognitionTokenIndex(
          final_transcript,
          textElements,
          lastFinalTranscriptIndex,
        )
        dispatch(setFinalTranscriptIndex(finalTranscriptIndex - 1))
      }

      if (interim_transcript !== "") {
        const interimTranscriptIndex = computeSpeechRecognitionTokenIndex(
          interim_transcript,
          textElements,
          lastFinalTranscriptIndex,
        )
        dispatch(setInterimTranscriptIndex(interimTranscriptIndex - 1))
      }
    },
  )

  speechRecognizer.start()
}

export const stopTeleprompter = (): AppThunk => dispatch => {
  if (speechRecognizer !== null) {
    speechRecognizer.stop()
    speechRecognizer = null
  }

  dispatch(stop())
}

export const changeLanguage = (language: string): AppThunk => () => {
  if (speechRecognizer !== null) {
    speechRecognizer.setLanguage(language)
  }
}
