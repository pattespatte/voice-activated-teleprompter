import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { escape } from "html-escaper"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { setContent, setFinalTranscriptIndex, setInterimTranscriptIndex } from "./contentSlice"
import { parseAllMetadata } from "../../lib/markdown-processor"

import {
  selectStatus,
  selectHorizontallyFlipped,
  selectVerticallyFlipped,
  selectFontSize,
  selectMargin,
  selectOpacity,
  selectScrollOffset,
  selectShowChords,
} from "../navbar/navbarSlice"

import {
  selectRawText,
  selectTextElements,
  selectFinalTranscriptIndex,
  selectInterimTranscriptIndex,
  selectIsMarkdown,
  selectProcessedHtml,
} from "./contentSlice"

import { startTeleprompter, stopTeleprompter } from "../../app/thunks"

export const Content = () => {
  const dispatch = useAppDispatch()

  const status = useAppSelector(selectStatus)
  const fontSize = useAppSelector(selectFontSize)
  const margin = useAppSelector(selectMargin)
  const opacity = useAppSelector(selectOpacity)
  const scrollOffset = useAppSelector(selectScrollOffset)
  const showChords = useAppSelector(selectShowChords)
  const horizontallyFlipped = useAppSelector(selectHorizontallyFlipped)
  const verticallyFlipped = useAppSelector(selectVerticallyFlipped)
  const rawText = useAppSelector(selectRawText)
  const textElements = useAppSelector(selectTextElements)
  const finalTranscriptIndex = useAppSelector(selectFinalTranscriptIndex)
  const interimTranscriptIndex = useAppSelector(selectInterimTranscriptIndex)
  const isMarkdown = useAppSelector(selectIsMarkdown)
  const processedHtml = useAppSelector(selectProcessedHtml)

  const style = {
    fontSize: `${fontSize}px`,
    padding: `0 ${margin}px`,
    lineHeight: '1.3',
  }

  const containerRef = useRef<null | HTMLDivElement>(null)
  const lastRef = useRef<null | HTMLDivElement>(null)
  const bottomSpacerRef = useRef<null | HTMLDivElement>(null)
  
  // Track the highest index we've scrolled to to ensure unidirectional scrolling
  const maxScrollIndexRef = useRef<number>(-1)

  // Store the last scroll position to ensure we never scroll backward
  const lastScrollPositionRef = useRef<number>(0);

  // Target scroll position for smooth interpolation
  const targetScrollRef = useRef<number>(0);
  const animatingRef = useRef<boolean>(false);

  // Track previous transcript index to detect click jumps (backward navigation)
  const prevTranscriptIndexRef = useRef<number>(-1);

  // Track last highlighted index for efficient markdown highlighting updates
  const lastHighlightedIndexRef = useRef<number>(-1);
  const maxEverHighlightedRef = useRef<number>(-1);
  const prevFinalIndexRef = useRef<number>(-1);
  const prevInterimIndexRef = useRef<number>(-1);

  // Smooth scroll animation using lerp
  const animateScroll = () => {
    if (!containerRef.current) {
      animatingRef.current = false;
      return;
    }
    const current = containerRef.current.scrollTop;
    const target = targetScrollRef.current;
    const diff = target - current;

    // Close enough — snap to target
    if (Math.abs(diff) < 1) {
      containerRef.current.scrollTop = target;
      animatingRef.current = false;
      return;
    }

    // Lerp: move 20% of remaining distance per frame
    containerRef.current.scrollTop = current + diff * 0.2;
    requestAnimationFrame(animateScroll);
  };

  useEffect(() => {
    if (containerRef.current) {
      // Use the higher of final or interim transcript index
      const currentTranscriptIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex);

      // Detect if this is a click (significant backward jump) vs singing (forward progression)
      // A jump of more than 5 words backward indicates a click
      const isClickJump = currentTranscriptIndex < prevTranscriptIndexRef.current - 5;

      // Reset max scroll index on click jumps OR when starting fresh from beginning after clicking elsewhere
      // If current index is much lower than max (e.g., clicked word 50, now singing word 0), reset
      if (isClickJump || (maxScrollIndexRef.current > 10 && currentTranscriptIndex < maxScrollIndexRef.current - 10)) {
        maxScrollIndexRef.current = Math.min(currentTranscriptIndex, -1);
        lastScrollPositionRef.current = 0;
        animatingRef.current = false;
      }

      // Update previous index for next comparison
      prevTranscriptIndexRef.current = currentTranscriptIndex;

      // Only scroll forward, never backward
      // Update the max index we've scrolled to
      if (currentTranscriptIndex > maxScrollIndexRef.current) {
        maxScrollIndexRef.current = currentTranscriptIndex;

        let targetElement: HTMLElement | null = null

        if (isMarkdown) {
          // For markdown, find the element with matching data-word-index
          // currentTranscriptIndex is token.index - 1 from the thunk, so +1 gives the token.index
          targetElement =
            containerRef.current.querySelector(`[data-word-index="${currentTranscriptIndex + 1}"]`) ||
            containerRef.current.querySelector(`[data-word-index="${currentTranscriptIndex}"]`)
        } else {
          // For plain text, use the ref
          targetElement = lastRef.current
        }

        if (targetElement && containerRef.current) {
          // Calculate the position to center the current word
          const elementRect = targetElement.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();

          // Calculate the element's position relative to the container
          const elementTop = elementRect.top - containerRect.top + containerRef.current.scrollTop;
          const scrollToPosition = elementTop - scrollOffset;

          // Ensure we don't scroll to negative positions
          const finalScrollPosition = Math.max(scrollToPosition, 0);

          // On click jumps, don't enforce the "never scroll backward" rule
          let actualScrollPosition = finalScrollPosition;
          if (!isClickJump) {
            actualScrollPosition = Math.max(finalScrollPosition, lastScrollPositionRef.current);
          }
          lastScrollPositionRef.current = actualScrollPosition;

          if (isClickJump) {
            // Click jumps: instant scroll
            containerRef.current.scrollTo({
              top: actualScrollPosition,
              behavior: "auto",
            })
            targetScrollRef.current = actualScrollPosition;
          } else {
            // Forward progression: smooth interpolated scroll
            targetScrollRef.current = actualScrollPosition;
            if (!animatingRef.current) {
              animatingRef.current = true;
              requestAnimationFrame(animateScroll);
            }
          }
        }
      } else if (currentTranscriptIndex < 0 && maxScrollIndexRef.current < 0) {
        lastScrollPositionRef.current = 0;
        targetScrollRef.current = 0;
        animatingRef.current = false;
        containerRef.current.scrollTo({
          top: 0,
          behavior: "auto",
        })
      }
    }
  }, [scrollOffset, finalTranscriptIndex, interimTranscriptIndex, textElements, isMarkdown])

  // Efficient markdown highlighting - additive only, never blinks
  useEffect(() => {
    if (!isMarkdown || !containerRef.current) {
      return
    }

    const finalIndex = finalTranscriptIndex
    const interimIndex = interimTranscriptIndex

    // Skip if nothing to highlight
    if (finalIndex < 0 && interimIndex < 0) {
      return
    }

    // Detect click jumps (large backward jump) — only time we clear highlighting
    const prevFinal = prevFinalIndexRef.current
    const prevInterim = prevInterimIndexRef.current
    const prevMax = Math.max(prevFinal, prevInterim)
    const currentMax = Math.max(finalIndex, interimIndex)
    const isClickJump = currentMax < prevMax - 5

    prevFinalIndexRef.current = finalIndex
    prevInterimIndexRef.current = interimIndex

    // Skip if nothing changed
    if (finalIndex === prevFinal && interimIndex === prevInterim) {
      return
    }

    // On click jump backward, reset and rebuild highlighting up to new position
    if (isClickJump) {
      maxEverHighlightedRef.current = -1
      const allSpans = containerRef.current.querySelectorAll('[data-word-index]')
      allSpans.forEach(span => {
        span.classList.remove('final-transcript', 'interim-transcript')
      })
    }

    // Track the highest we've ever highlighted — gray stays permanently
    const highlightUpTo = Math.max(finalIndex, interimIndex)
    const newMax = Math.max(maxEverHighlightedRef.current, highlightUpTo)
    const oldMax = maxEverHighlightedRef.current
    maxEverHighlightedRef.current = newMax
    lastHighlightedIndexRef.current = highlightUpTo

    const container = containerRef.current
    const highlightThreshold = newMax + 1
    const prevThreshold = oldMax < 0 ? -1 : oldMax + 1
    const interimTarget = interimIndex + 1

    // Only touch spans in the newly highlighted range (oldMax → newMax)
    const allSpans = container.querySelectorAll('[data-word-index]')
    allSpans.forEach(span => {
      const idx = parseInt(span.getAttribute('data-word-index') || '-1', 10)
      if (idx < 0) return

      if (idx > prevThreshold && idx <= highlightThreshold) {
        // New span entering highlighted range
        span.classList.remove('interim-transcript')
        span.classList.add('final-transcript')
      }
    })

    // Handle interim highlight: move the yellow "current word" marker
    // First remove previous interim highlight
    const prevInterimTarget = prevInterim + 1
    const prevInterimSpan = container.querySelector(`[data-word-index="${prevInterimTarget}"]`)
    if (prevInterimSpan && prevInterimTarget !== interimTarget) {
      prevInterimSpan.classList.remove('interim-transcript')
      // Re-add final-transcript if within range
      if (prevInterimTarget <= highlightThreshold) {
        prevInterimSpan.classList.add('final-transcript')
      }
    }

    // Set new interim highlight
    if (interimIndex >= 0) {
      const interimSpan = container.querySelector(`[data-word-index="${interimTarget}"]`)
      if (interimSpan) {
        interimSpan.classList.remove('final-transcript')
        interimSpan.classList.add('interim-transcript')
      }
    }
  }, [finalTranscriptIndex, interimTranscriptIndex, isMarkdown])

  useLayoutEffect(() => {
    if (!containerRef.current || !bottomSpacerRef.current) {
      return
    }

    const containerHeight = containerRef.current.clientHeight
    bottomSpacerRef.current.style.height = `${scrollOffset + containerHeight}px`

  }, [scrollOffset, isMarkdown ? 0 : textElements.length, isMarkdown, finalTranscriptIndex, interimTranscriptIndex])

  // Keyboard shortcuts: Space (play/pause), ESC (stop), Arrow keys (navigate)
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Skip keyboard shortcuts when in edit mode
      if (status === "editing") return;

      // Skip when the user is typing in any input/textarea (navbar URL field,
      // debug textarea, etc.) so Space/Escape/Arrows don't hijack their input.
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === "INPUT" ||
        activeElement.tagName === "TEXTAREA" ||
        activeElement.getAttribute("contenteditable") === "true"
      )
      if (isInputFocused) return

      const maxIndex = isMarkdown
        ? (containerRef.current?.querySelectorAll('[data-word-index]').length || 0) - 1
        : textElements.length - 1;

      if (event.code === "Escape") {
        event.preventDefault();
        dispatch(stopTeleprompter());
      } else if (event.code === "Space") {
        event.preventDefault();
        if (status === "stopped") {
          dispatch(startTeleprompter());
        } else if (status === "started") {
          dispatch(stopTeleprompter());
        }
      } else if (event.code === "ArrowUp") {
        event.preventDefault();
        dispatch(setFinalTranscriptIndex(Math.max(-1, finalTranscriptIndex - 15)));
        dispatch(setInterimTranscriptIndex(Math.max(-1, interimTranscriptIndex - 15)));
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        dispatch(setFinalTranscriptIndex(Math.max(-1, finalTranscriptIndex - 5)));
        dispatch(setInterimTranscriptIndex(Math.max(-1, interimTranscriptIndex - 5)));
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        dispatch(setFinalTranscriptIndex(Math.min(maxIndex, finalTranscriptIndex + 15)));
        dispatch(setInterimTranscriptIndex(Math.min(maxIndex, interimTranscriptIndex + 15)));
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        dispatch(setFinalTranscriptIndex(Math.min(maxIndex, finalTranscriptIndex + 5)));
        dispatch(setInterimTranscriptIndex(Math.min(maxIndex, interimTranscriptIndex + 5)));
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [status, textElements.length, isMarkdown, finalTranscriptIndex, interimTranscriptIndex, dispatch])

  const metaData = isMarkdown ? parseAllMetadata(rawText) : null
  const [showMeta, setShowMeta] = useState(false)
  const metaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMeta) return
    const handleClickOutside = (e: MouseEvent) => {
      if (metaRef.current && !metaRef.current.contains(e.target as Node)) {
        setShowMeta(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showMeta])

  return (
    <main className="content-area">
      {metaData && Object.keys(metaData).length > 0 && status !== "editing" && (
        <div className="meta-info" ref={metaRef}>
          <button
            className={`meta-info-button${showMeta ? " active" : ""}`}
            onClick={() => setShowMeta(!showMeta)}
            aria-expanded={showMeta}
            aria-label="Show song metadata"
          >
            ℹ
          </button>
          {showMeta && (
            <div className="meta-info-popover">
              {Object.entries(metaData).map(([key, value]) => (
                <div key={key}>
                  <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong>{" "}
                  {key === "source" ? (
                    <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                  ) : (
                    value
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {status === "editing" ? (
        <textarea
          className="content"
          style={style}
          value={rawText}
          onChange={e => dispatch(setContent(e.target.value || ""))}
          placeholder="Enter your teleprompter text here..."
          autoFocus
        />
      ) : (
        <div
          className="content"
          ref={containerRef}
          style={{
            ...style,
            opacity: opacity / 100,
            transform: `scale(${horizontallyFlipped ? "-1" : "1"}, ${verticallyFlipped ? "-1" : "1"})`,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
          }}
        >
          {isMarkdown && processedHtml ? (
            <div
              className={`markdown-content${!showChords ? " hide-chords" : ""}`}
              onClick={(e) => {
                // Find the closest element with data-word-index attribute
                const target = e.target as HTMLElement
                const wordSpan = target.closest('[data-word-index]')

                if (wordSpan) {
                  const wordIndex = parseInt(wordSpan.getAttribute('data-word-index') || '-1', 10)
                  if (wordIndex >= 0) {
                    dispatch(setFinalTranscriptIndex(wordIndex - 1))
                    dispatch(setInterimTranscriptIndex(wordIndex - 1))
                  }
                }
              }}
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          ) : (
            // Render plain text elements (existing logic)
            textElements.map((textElement, index, array) => {
              // Determine which element should have the ref for scrolling
              // Use the current transcript index for the ref
              const currentTranscriptIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex);
              const shouldHaveRef = currentTranscriptIndex >= 0 &&
                textElement.index === currentTranscriptIndex + 1;
              
              const itemProps = shouldHaveRef ? { ref: lastRef } : {}
              return (
                <span
                  key={textElement.index}
                  onClick={() => {
                    dispatch(setFinalTranscriptIndex(index - 1))
                    dispatch(setInterimTranscriptIndex(index - 1))
                  }}
                  className={
                    finalTranscriptIndex > 0 &&
                    textElement.index <= finalTranscriptIndex + 1
                      ? "final-transcript"
                      : interimTranscriptIndex > 0 &&
                          textElement.index <= interimTranscriptIndex + 1
                            ? "interim-transcript"
                            : "has-text-white"
                  }
                  style={{
                    display: textElement.value.includes('\n') ? "inline" : "inline-block",
                    margin: (() => {
                      if (textElement.value.includes('\n')) return "0";
                      if (textElement.type === "TOKEN") return "0 .25rem";
                      if (textElement.value === ' "') return "0 -.25rem 0 .25rem"; // Small margin for spaces
                      if (textElement.value === '" ') return "0 .25rem 0 -.25rem"; // Small margin for spaces
                      return "0"; // No margin for punctuation and quotes
                    })(),
                    cursor: 'pointer',
                  }}
                  {...itemProps}
                  dangerouslySetInnerHTML={{
                    __html: escape(textElement.value).replace(/\n/g, "<br>"),
                  }}
                />
              )
            })
          )}
          <div
            aria-hidden="true"
            ref={bottomSpacerRef}
            style={{ height: 0, flexShrink: 0 }}
          />
        </div>
      )}
    </main>
  )
}
