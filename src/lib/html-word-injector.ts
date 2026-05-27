import type { TextElement } from "./word-tokenizer"

/**
 * Wraps each word in HTML with a span containing a data-word-index attribute.
 * This allows clicking on words in rendered markdown to map back to text elements.
 */
export const injectWordSpans = (html: string, textElements: TextElement[]): string => {
  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = html

  // Track which text element we're currently mapping
  let textElementIndex = 0

  // Sequential counter for data-word-index (only TOKENs get indices, no DELIMITER gaps)
  let wordSpanIndex = 0

  // Recursive function to process text nodes
  const processNode = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const textContent = node.textContent
      if (!textContent) {
        return
      }

      // Split text into tokens and delimiters
      const tokens: { type: 'TOKEN' | 'DELIMITER', value: string, textElementIndex?: number }[] = []

      for (let i = 0; i < textContent.length;) {
        const char = textContent[i]
        const isTokenChar = /[A-Za-zÀ-ÿА-Яа-я0-9_]/.test(char)

        // Extract the token or delimiter
        let value = ''
        if (isTokenChar) {
          while (i < textContent.length && /[A-Za-zÀ-ÿА-Яа-я0-9_]/.test(textContent[i])) {
            value += textContent[i]
            i++
          }
          tokens.push({ type: 'TOKEN', value })
        } else {
          value = char
          i++
          tokens.push({ type: 'DELIMITER', value })
        }
      }

      // Create a document fragment to replace the text node
      const fragment = document.createDocumentFragment()

      // For each token, find matching text element and wrap in span
      for (const token of tokens) {
        if (token.type === 'TOKEN') {
          // Find matching text element (search ahead from current position)
          let foundIndex = -1
          for (let j = textElementIndex; j < textElements.length; j++) {
            if (textElements[j].type === 'TOKEN' &&
                textElements[j].value.toLowerCase() === token.value.toLowerCase()) {
              foundIndex = j
              textElementIndex = j + 1
              break
            }
          }

          // If we couldn't find a match forward, try searching from the beginning
          // (handles cases where HTML structure differs from text element order)
          if (foundIndex === -1) {
            for (let j = 0; j < textElements.length; j++) {
              if (textElements[j].type === 'TOKEN' &&
                  textElements[j].value.toLowerCase() === token.value.toLowerCase()) {
                // Only use this if it's after our current position
                if (j >= textElementIndex) {
                  foundIndex = j
                  textElementIndex = j + 1
                  break
                }
              }
            }
          }

          if (foundIndex >= 0) {
            const span = document.createElement('span')
            span.textContent = token.value
            span.setAttribute('data-word-index', wordSpanIndex.toString())
            wordSpanIndex++
            span.style.cursor = 'pointer'
            span.style.display = 'inline'
            span.style.pointerEvents = 'auto'
            fragment.appendChild(span)
          } else {
            // Couldn't find matching text element, just add as text
            fragment.appendChild(document.createTextNode(token.value))
          }
        } else {
          // Delimiter - add as text
          fragment.appendChild(document.createTextNode(token.value))
        }
      }

      // Replace the text node with the fragment
      node.parentNode?.replaceChild(fragment, node)
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element
      const tagName = element.tagName

      // Skip elements where we don't want word wrapping
      // - Headers (h1-h6): "## Verse 1" etc.
      // - Code blocks, pre, style, script
      // - Chord spans (class="chord"): "[G]", "[C]" etc.
      // - Strong (bold) elements like "**Key:**", "**Time:**"
      const skipTags = ['CODE', 'PRE', 'STYLE', 'SCRIPT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG']
      if (skipTags.includes(tagName) || element.classList.contains('chord') || element.classList.contains('chord-word')) {
        return
      }

      // Process child nodes
      const children = Array.from(element.childNodes)
      for (const child of children) {
        processNode(child)
      }
    }
  }

  // Process all nodes in the temp div
  const children = Array.from(tempDiv.childNodes)
  for (const child of children) {
    processNode(child)
  }

  return tempDiv.innerHTML
}
