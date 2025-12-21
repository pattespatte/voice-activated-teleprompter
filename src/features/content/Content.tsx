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

  useEffect(() => {
    if (containerRef.current) {
      // Use the higher of final or interim transcript index
      const currentTranscriptIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex);
      
      // Only scroll forward, never backward
      // Update the max index we've scrolled to
      if (currentTranscriptIndex > maxScrollIndexRef.current) {
        maxScrollIndexRef.current = currentTranscriptIndex;
        
        // Find the element with the scroll index
        const targetElement = textElements.find(el => el.index === currentTranscriptIndex + 1);
        
        if (targetElement && lastRef.current && containerRef.current) {
          // Calculate the position to center the current word
          // Use getBoundingClientRect() to get the actual position of the element
          const elementRect = lastRef.current.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          
          // Calculate the element's position relative to the container
          // Add the current scroll position to get the absolute position in the document
          const elementTop = elementRect.top - containerRect.top + containerRef.current.scrollTop;
          const scrollToPosition = elementTop - scrollOffset;
          
          // Ensure we don't scroll to negative positions
          const finalScrollPosition = Math.max(scrollToPosition, 0);
          
          // Ensure we never scroll backward from our last position
          const actualScrollPosition = Math.max(finalScrollPosition, lastScrollPositionRef.current);
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
  }, [lastRef, scrollOffset, finalTranscriptIndex, interimTranscriptIndex, textElements])

  // Apply highlighting to markdown HTML elements based on speech recognition state
  useEffect(() => {
    if (isMarkdown && containerRef.current) {
      const markdownContent = containerRef.current.querySelector('.markdown-content');
      if (!markdownContent) return;

      // Reset the markdown content to its original state
      markdownContent.innerHTML = processedHtml;

      // If we have transcript indices, apply highlighting
      if (finalTranscriptIndex >= 0 || interimTranscriptIndex >= 0) {
        // Get all text nodes from the markdown content
        const walker = document.createTreeWalker(
          markdownContent,
          NodeFilter.SHOW_TEXT
        );

        let currentNode = walker.nextNode() as Text;
        let wordIndex = 0;

        // Process each text node and apply highlighting
        while (currentNode) {
          const text = currentNode.textContent || '';
          if (text.trim()) {
            // Split text into words and wrap each word in a span
            const words = text.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
              if (word.trim()) {
                const span = document.createElement('span');
                span.textContent = word;
                
                // Apply highlighting based on transcript indices
                if (wordIndex <= finalTranscriptIndex + 1) {
                  span.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  span.style.borderBottom = '2px solid #9e9e9e';
                  span.style.color = '#9e9e9e';
                } else if (wordIndex <= interimTranscriptIndex + 1) {
                  span.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
                  span.style.borderBottom = '2px solid #ffdd57';
                  span.style.color = '#ffdd57';
                }
                
                fragment.appendChild(span);
                wordIndex++;
              } else if (word) {
                // Add whitespace as-is
                fragment.appendChild(document.createTextNode(word));
              }
            });
            
            // Replace the text node with our highlighted spans
            currentNode.parentNode?.replaceChild(fragment, currentNode);
          }
          currentNode = walker.nextNode() as Text;
        }
      }
    }
  }, [isMarkdown, finalTranscriptIndex, interimTranscriptIndex, processedHtml])

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
            <>
              {/* Render formatted markdown HTML with highlighting */}
              <div
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
                onClick={(e) => {
                  // For markdown content, we need to map the click position to text elements
                  if (isMarkdown) {
                    // Get all text nodes from the markdown content
                    const textNodes = Array.from(containerRef.current?.querySelectorAll('.markdown-content *') || [])
                    const target = e.target as HTMLElement
                    
                    // Find the clicked text node by checking if target is contained in any text node
                    let clickedIndex = -1
                    for (let i = 0; i < textNodes.length; i++) {
                      if (textNodes[i].contains(target)) {
                        clickedIndex = i
                        break
                      }
                    }
                    
                    if (clickedIndex >= 0) {
                      dispatch(setFinalTranscriptIndex(clickedIndex - 1))
                      dispatch(setInterimTranscriptIndex(clickedIndex - 1))
                    }
                  }
                }}
              />
              
              {/* Render invisible text elements for speech recognition functionality */}
              <div style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                {textElements.map((textElement, index, array) => {
                  // Determine which element should have the ref for scrolling
                  // Use the current transcript index for the ref
                  const currentTranscriptIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex);
                  const shouldHaveRef = currentTranscriptIndex >= 0 &&
                    textElement.index === currentTranscriptIndex + 1;
                  
                  const itemProps = shouldHaveRef ? { ref: lastRef } : {}
                  
                  return (
                    <span
                      key={textElement.index}
                      style={{
                        display: textElement.value.includes('\n') ? "inline" : "inline-block",
                        margin: (() => {
                          if (textElement.value.includes('\n')) return "0";
                          if (textElement.type === "TOKEN") return "0 .25rem";
                          if (textElement.value === ' "') return "0 -.25rem 0 .25rem"; // Small margin for spaces
                          if (textElement.value === '" ') return "0 .25rem 0 -.25rem"; // Small margin for spaces
                          return "0"; // No margin for punctuation and quotes
                        })(),
                        // Make text elements completely invisible but still functional for scrolling
                        opacity: 0,
                        height: 0,
                        overflow: 'hidden',
                      }}
                      {...itemProps}
                      dangerouslySetInnerHTML={{
                        __html: escape(textElement.value).replace(/\n/g, "<br>"),
                      }}
                    />
                  )
                })}
              </div>
            </>
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
