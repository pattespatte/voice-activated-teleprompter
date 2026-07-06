import type { AppThunk } from "./store"
import {
  start,
  stop,
  setUrlLoadError,
} from "../features/navbar/navbarSlice"
import {
  setFinalTranscriptIndex,
  setInterimTranscriptIndex,
  setContent,
  resetTranscriptionIndices,
} from "../features/content/contentSlice"
import SpeechRecognizer from "../lib/speech-recognizer"
import { computeSpeechRecognitionTokenIndex } from "../lib/speech-matcher"

let speechRecognizer: SpeechRecognizer | null = null

/**
 * Fetches text content from a URL and loads it into the teleprompter.
 * Shared by the "Load from URL" button and the `?content=` query-param path.
 *
 * Validates the scheme is http(s), fetches, infers markdown from the pathname,
 * and dispatches `setContent` + `resetTranscriptionIndices`. On any failure
 * (bad scheme, HTTP non-2xx, CORS/network), dispatches `setUrlLoadError` with
 * a friendly message.
 *
 * @returns the error string on failure, or `null` on success — so callers
 *   (the button) can branch on the result without a racy selector read.
 */
export const loadContentFromUrl =
  (url: string): AppThunk<Promise<string | null>> =>
  async dispatch => {
    // Clear any previous error on a fresh attempt.
    dispatch(setUrlLoadError(null))

    if (!/^https?:\/\//i.test(url)) {
      const msg = "URL must start with http:// or https://"
      dispatch(setUrlLoadError(msg))
      return msg
    }

    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const content = await response.text()
      const pathname = new URL(url).pathname.toLowerCase()
      const isMarkdown =
        pathname.endsWith(".md") || pathname.endsWith(".markdown")
      dispatch(setContent({ content, isMarkdown }))
      dispatch(resetTranscriptionIndices())
      return null
    } catch (err) {
      // fetch() throws a TypeError on network/CORS failures; its message is
      // uselessly generic ("Failed to fetch"), so translate it.
      const isNetwork =
        err instanceof TypeError && /fetch|network/i.test(err.message)
      const msg = isNetwork
        ? "Could not load — the source may block cross-origin requests (CORS), or the host is unreachable."
        : err instanceof Error
          ? err.message
          : "Unknown error loading URL."
      dispatch(setUrlLoadError(msg))
      return msg
    }
  }

// Accumulate recent recognized words for more robust matching.
// Chrome's continuous mode delivers short chunks; without context,
// the matcher can't reliably place 1-3 word fragments in a long song.
const RECENT_WORDS_MAX = 40
let recentFinalWords: string[] = []

export const startTeleprompter = (): AppThunk => (dispatch, getState) => {
  dispatch(start())
  recentFinalWords = []

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
        // Add new words to the recent history
        const newWords = final_transcript.trim().split(/\s+/).filter(w => w.length > 0)
        recentFinalWords.push(...newWords)
        // Keep only the most recent words
        if (recentFinalWords.length > RECENT_WORDS_MAX) {
          recentFinalWords = recentFinalWords.slice(-RECENT_WORDS_MAX)
        }

        // Match using accumulated context for better accuracy
        const contextString = recentFinalWords.join(" ")
        const finalTranscriptIndex = computeSpeechRecognitionTokenIndex(
          contextString,
          textElements,
          lastFinalTranscriptIndex,
        )
        dispatch(setFinalTranscriptIndex(finalTranscriptIndex - 1))

        // Trim history after a successful advance — keep enough context for disambiguation
        // but not so much that stale words inflate the comparison string
        if (finalTranscriptIndex > lastFinalTranscriptIndex) {
          recentFinalWords = recentFinalWords.slice(-5)
        }
      }

      if (interim_transcript !== "") {
        // Combine recent final + current interim for real-time tracking
        const interimWords = interim_transcript.trim().split(/\s+/).filter(w => w.length > 0)
        const combined = [...recentFinalWords, ...interimWords].join(" ")
        const interimTranscriptIndex = computeSpeechRecognitionTokenIndex(
          combined,
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

  recentFinalWords = []
  dispatch(stop())
}

export const changeLanguage = (language: string): AppThunk => () => {
  if (speechRecognizer !== null) {
    speechRecognizer.setLanguage(language)
  }
}
