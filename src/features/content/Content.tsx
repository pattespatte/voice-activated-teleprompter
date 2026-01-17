import { useEffect, useLayoutEffect, useRef } from "react"
import { escape } from "html-escaper"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import { setContent, setFinalTranscriptIndex, setInterimTranscriptIndex } from "./contentSlice"

import {
  selectStatus,
  selectHorizontallyFlipped,
  selectVerticallyFlipped,
  selectFontSize,
  selectMargin,
  selectOpacity,
  selectScrollOffset,
} from "../navbar/navbarSlice"

import {
  selectRawText,
  selectTextElements,
  selectFinalTranscriptIndex,
  selectInterimTranscriptIndex,
  selectIsMarkdown,
  selectProcessedHtml,
} from "./contentSlice"

export const Content = () => {
  const dispatch = useAppDispatch()

  const status = useAppSelector(selectStatus)
  const fontSize = useAppSelector(selectFontSize)
  const margin = useAppSelector(selectMargin)
  const opacity = useAppSelector(selectOpacity)
  const scrollOffset = useAppSelector(selectScrollOffset)
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
    lineHeight: '1.6',
  }

  const containerRef = useRef<null | HTMLDivElement>(null)
  const lastRef = useRef<null | HTMLDivElement>(null)
  const bottomSpacerRef = useRef<null | HTMLDivElement>(null)
  
  // Track the highest index we've scrolled to to ensure unidirectional scrolling
  const maxScrollIndexRef = useRef<number>(-1)

  // Store the last scroll position to ensure we never scroll backward
  const lastScrollPositionRef = useRef<number>(0);

  // Track previous transcript index to detect click jumps (backward navigation)
  const prevTranscriptIndexRef = useRef<number>(-1);

  // Track last highlighted index for efficient markdown highlighting updates
  const lastHighlightedIndexRef = useRef<number>(-1);

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
          // Try current index first, then next index (in case of delimiter gap), then fallback
          targetElement =
            containerRef.current.querySelector(`[data-word-index="${currentTranscriptIndex + 1}"]`) ||
            containerRef.current.querySelector(`[data-word-index="${currentTranscriptIndex + 2}"]`) ||
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

          containerRef.current.scrollTo({
            top: actualScrollPosition,
            behavior: "smooth",
          })
        }
      } else if (currentTranscriptIndex < 0 && maxScrollIndexRef.current < 0) {
        lastScrollPositionRef.current = 0;
        containerRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        })
      }
    }
  }, [scrollOffset, finalTranscriptIndex, interimTranscriptIndex, textElements, isMarkdown])

  // Efficient markdown highlighting - only update spans that changed
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

    // Determine which word should be highlighted
    const highlightUpTo = Math.max(finalIndex, interimIndex)
    if (highlightUpTo === lastHighlightedIndexRef.current) {
      return
    }

    const lastIndex = lastHighlightedIndexRef.current
    lastHighlightedIndexRef.current = highlightUpTo

    // Clear all highlighting when going backward
    if (highlightUpTo < lastIndex) {
      const allSpans = containerRef.current.querySelectorAll('[data-word-index]')
      allSpans.forEach(span => {
        span.classList.remove('final-transcript', 'interim-transcript')
      })
    }

    // Determine range to update (data-word-index is 1-based)
    const startIndex = lastIndex < 0 ? 0 : Math.min(lastIndex, highlightUpTo) + 1
    const endIndex = highlightUpTo + 1

    // Update only the spans in the changed range
    for (let i = startIndex; i <= endIndex; i++) {
      const span = containerRef.current.querySelector(`[data-word-index="${i}"]`)
      if (span) {
        // Remove old classes
        span.classList.remove('final-transcript', 'interim-transcript')

        // Check interim (yellow) first so it takes precedence over final (gray)
        if (interimIndex >= 0 && i === interimIndex + 1) {
          span.classList.add('interim-transcript')
        } else if (finalIndex >= 0 && i <= finalIndex + 1) {
          span.classList.add('final-transcript')
        }
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

  return (
    <main className="content-area">
      {status === "editing" ? (
        <textarea
          className="content"
          style={style}
          value={rawText}
          onChange={e => dispatch(setContent(e.target.value || ""))}
          placeholder="Enter your teleprompter text here..."
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
              className="markdown-content"
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
