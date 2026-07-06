import { useState, useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import {
  toggleDebug,
  selectIsDebugEnabled,
  selectDebugTranscript,
  setDebugTranscript,
} from "./debugSlice"
import {
  setFinalTranscriptIndex,
  setInterimTranscriptIndex,
  selectTextElements,
  selectFinalTranscriptIndex,
} from "../content/contentSlice"
import { computeSpeechRecognitionTokenIndex } from "../../lib/speech-matcher"
import { selectStatus } from "../navbar/navbarSlice"

const log = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log(...args)
  }
}

export const DebugPanel = () => {
  const dispatch = useAppDispatch()
  const isEnabled = useAppSelector(selectIsDebugEnabled)
  const debugTranscript = useAppSelector(selectDebugTranscript)
  const textElements = useAppSelector(selectTextElements)
  const finalTranscriptIndex = useAppSelector(selectFinalTranscriptIndex)
  const status = useAppSelector(selectStatus)
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("")

  const handleSimulateSpeech = () => {
    if (debugTranscript.trim() === "") return

    log("=== DEBUG MODE: Simulating Speech ===")
    log("Debug transcript:", debugTranscript)
    log("Current final transcript index:", finalTranscriptIndex)
    log("Text elements count:", textElements.length)

    // Log first few text elements as simple strings
    const firstFew = textElements.slice(0, 5).map(e => `[${e.index}] "${e.value}" (${e.type})`).join(", ")
    log("First few text elements:", firstFew)

    const index = computeSpeechRecognitionTokenIndex(
      debugTranscript,
      textElements,
      finalTranscriptIndex,
    )

    log("Computed new index:", index)

    // Find and log the target element
    const targetElement = textElements.find(e => e.index === index)
    if (targetElement) {
      log("Target element found:", `[${targetElement.index}] "${targetElement.value}" (${targetElement.type})`)
    } else {
      log("Target element: NOT FOUND")
    }

    dispatch(setFinalTranscriptIndex(index))
    dispatch(setInterimTranscriptIndex(index))

    log("Dispatched index update. New index:", index)
    log("=====================================")
  }

  const handleAppendAndSimulate = () => {
    const wordToAdd = debugTranscript.trim()
    if (wordToAdd === "") return

    // Add to accumulated transcript
    const newTranscript = accumulatedTranscript === "" ? wordToAdd : accumulatedTranscript + " " + wordToAdd
    setAccumulatedTranscript(newTranscript)

    log("=== DEBUG MODE: Append and Simulate ===")
    log("Word to add:", wordToAdd)
    log("New accumulated transcript:", newTranscript)
    log("Current final transcript index:", finalTranscriptIndex)

    const index = computeSpeechRecognitionTokenIndex(
      newTranscript,
      textElements,
      finalTranscriptIndex,
    )

    log("Computed new index:", index)

    const targetElement = textElements.find(e => e.index === index)
    if (targetElement) {
      log("Target element found:", `[${targetElement.index}] "${targetElement.value}" (${targetElement.type})`)
    } else {
      log("Target element: NOT FOUND")
    }

    dispatch(setFinalTranscriptIndex(index))
    dispatch(setInterimTranscriptIndex(index))

    log("=====================================")
  }

  const handleResetAccumulated = () => {
    setAccumulatedTranscript("")
    dispatch(setFinalTranscriptIndex(-1))
    dispatch(setInterimTranscriptIndex(-1))
    log("=== DEBUG MODE: Reset ===")
    log("Accumulated transcript cleared")
    log("=====================================")
  }

  // Toggle a body class so the content area can shrink (CSS-only, no prop
  // drilling) and leave room for the sidebar. The class is absent in
  // production because this component is never mounted there.
  useEffect(() => {
    document.body.classList.toggle("debug-sidebar-open", isEnabled)
    return () => document.body.classList.remove("debug-sidebar-open")
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <div className="debug-panel">
      <div className="debug-panel-content">
        <div className="debug-header">
          <h3>Debug Mode - Simulate Speech Recognition</h3>
          <button
            type="button"
            className="delete"
            onClick={() => dispatch(toggleDebug())}
            aria-label="Close debug panel"
          />
        </div>

        <div className="debug-body">
          {status === "started" && (
            <div className="debug-warning">
              <small>
                ⚠️ <strong>Warning:</strong> Teleprompter is currently running! Actual speech recognition will override debug mode.
                Stop the teleprompter first (click the ■ button) for debug mode to work properly.
              </small>
            </div>
          )}

          <p className="debug-description">
            Type a word or phrase to simulate speech recognition and test scrolling without speaking.
          </p>

          <textarea
            className="debug-textarea"
            value={debugTranscript}
            onChange={e => dispatch(setDebugTranscript(e.target.value))}
            placeholder="Type a word or phrase here to test scrolling...
Example: Amazing grace how sweet the sound"
            rows={4}
          />

          <div className="debug-buttons">
            <button
              type="button"
              className="button is-small is-info"
              onClick={handleSimulateSpeech}
              disabled={debugTranscript.trim() === ""}
            >
              Simulate Speech
            </button>
            <button
              type="button"
              className="button is-small is-success"
              onClick={handleAppendAndSimulate}
              disabled={debugTranscript.trim() === ""}
              title="Add word to accumulated transcript and simulate"
            >
              + Add & Simulate
            </button>
            <button
              type="button"
              className="button is-small is-warning"
              onClick={handleResetAccumulated}
              title="Reset accumulated transcript and start over"
            >
              Reset
            </button>
            <button
              type="button"
              className="button is-small"
              onClick={() => dispatch(setDebugTranscript(""))}
            >
              Clear Input
            </button>
          </div>

          {accumulatedTranscript && (
            <div className="debug-accumulated">
              <small>
                <strong>Accumulated transcript:</strong> "{accumulatedTranscript}"
              </small>
            </div>
          )}

          <div className="debug-info">
            <small>
              Current transcript index: {finalTranscriptIndex}<br />
              Total text elements: {textElements.length}<br />
              Status: {status}<br />
              {textElements.length > 0 && (
                <>
                  Available text preview: "{textElements.slice(0, 10).map(e => e.value).join("").trim().substring(0, 100)}..."
                </>
              )}
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}
