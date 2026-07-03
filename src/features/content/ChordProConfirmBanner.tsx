import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { confirmChordPro, rejectChordPro } from "./contentSlice"
import { selectStatus } from "../navbar/navbarSlice"
import { hasChordProOrFrontmatter } from "../../lib/markdown-processor"

// Auto-confirm the detection as "Correct" after this delay.
const AUTO_CONFIRM_MS = 6000

/**
 * Brief confirmation shown when rendered content is detected as ChordPro
 * (or YAML frontmatter). Lets the user override a false-positive detection:
 * [Incorrect] re-renders as plain text. Visibility is derived from state.
 */
export const ChordProConfirmBanner = () => {
  const dispatch = useAppDispatch()
  const status = useAppSelector(selectStatus)
  const rawText = useAppSelector(state => state.content.rawText)
  const isMarkdown = useAppSelector(state => state.content.isMarkdown)
  const rejected = useAppSelector(state => state.content.chordProRejected)
  const dismissed = useAppSelector(state => state.content.chordProDismissed)

  const visible =
    status !== "editing"
    && isMarkdown
    && !rejected
    && !dismissed
    && hasChordProOrFrontmatter(rawText)

  // [Correct] is the default — auto-apply it after a short delay.
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => dispatch(confirmChordPro()), AUTO_CONFIRM_MS)
    return () => clearTimeout(timer)
  }, [visible, dispatch])

  if (!visible) return null

  return (
    <div className="chordpro-confirm-banner" role="status" aria-live="polite">
      <span className="chordpro-confirm-message">ChordPro syntax detected</span>
      <div className="chordpro-confirm-actions">
        <button
          type="button"
          className="chordpro-confirm-btn correct"
          onClick={() => dispatch(confirmChordPro())}
          autoFocus
        >
          Correct
        </button>
        <button
          type="button"
          className="chordpro-confirm-btn incorrect"
          onClick={() => dispatch(rejectChordPro())}
        >
          Incorrect
        </button>
      </div>
    </div>
  )
}
