import { marked } from "marked"
import { injectWordSpans } from "./html-word-injector"
import type { TextElement } from "./word-tokenizer"

// Configure marked options for teleprompter use case
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
})

/**
 * Detects if content is markdown by checking for common markdown patterns
 */
export const isMarkdownContent = (content: string): boolean => {
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*.*?\*\*/, // Bold text
    /\*.*?\*/, // Italic text
    /_.*?_/, // Italic text (underscore)
    /`.*?`/, // Inline code
    /\[.*?\]\(.*?\)/, // Links
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /^>\s+/m, // Blockquotes
  ]

  return markdownPatterns.some(pattern => pattern.test(content))
}

/**
 * Converts markdown content to HTML for display
 */
export const markdownToHtml = async (content: string): Promise<string> => {
  try {
    const result = await marked(content)
    return result
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error parsing markdown:", error)
    }
    return content // Return original content if parsing fails
  }
}

/**
 * Synchronous version of markdownToHtml for backward compatibility
 */
export const markdownToHtmlSync = (content: string): string => {
  try {
    // Process chords before markdown parsing
    const processedContent = processChords(content)
    return marked.parse(processedContent) as string
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error parsing markdown:", error)
    }
    return content // Return original content if parsing fails
  }
}

/**
 * Converts markdown to HTML with clickable word spans for index mapping
 */
export const markdownToHtmlWithWordSpans = (content: string, textElements: TextElement[]): string => {
  try {
    const processedContent = processChords(content)
    const html = marked.parse(processedContent) as string
    return injectWordSpans(html, textElements)
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error parsing markdown:", error)
    }
    return content
  }
}

const CHORD_REGEX = /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/
const CHORD_REGEX_GLOBAL = /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g

/**
 * Processes chords in ChordPro format [G], [C], etc.
 * Positions chords above the word they precede by wrapping word + chord in a container.
 * Also marks lines containing chords with .has-chords class.
 */
const processChords = (content: string): string => {
  const lines = content.split('\n')

  const processedLines = lines.map(line => {
    // Check if line has any chords
    if (!CHORD_REGEX_GLOBAL.test(line)) return line
    CHORD_REGEX_GLOBAL.lastIndex = 0

    let result = ''
    let remaining = line
    let hasChords = false

    while (remaining.length > 0) {
      // Use non-global regex for single match with index
      const chordMatch = remaining.match(CHORD_REGEX)

      if (!chordMatch || chordMatch.index === undefined) {
        result += remaining
        break
      }

      const chordIndex = chordMatch.index
      const chord = chordMatch[0].slice(1, -1)

      // Add any text before the chord
      result += remaining.substring(0, chordIndex)

      // Skip the chord itself
      remaining = remaining.substring(chordIndex + chordMatch[0].length)

      // Skip whitespace and any additional chord notations to find the next text word
      const afterChord = remaining.replace(/^(\s*)/, '')
      const leadingWhitespace = RegExp.$1

      // Skip over any chord notations that follow (two-line format: chord-only lines)
      let skipped = afterChord
      let skipMatch
      while ((skipMatch = skipped.match(CHORD_REGEX)) && skipMatch.index === 0) {
        result += `<span class="chord-word"><span class="chord">${skipMatch[0].slice(1, -1)}</span></span>`
        skipped = skipped.substring(skipMatch[0].length).replace(/^\s*/, '')
      }

      // Find the next text word (letters/digits, not another chord)
      const wordMatch = skipped.match(/^(\S+)/)
      if (wordMatch) {
        const word = wordMatch[1]
        remaining = skipped.substring(word.length)

        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span>${word}</span>`
        hasChords = true
      } else {
        // Chord with no following word (end of line or chord-only line)
        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span></span>`
        remaining = skipped
        hasChords = true
      }
    }

    if (hasChords) {
      return `<span class="has-chords">${result}</span>`
    }
    return result
  })

  return processedLines.join('\n')
}

/**
 * Strips markdown formatting to get plain text for speech recognition
 */
export const stripMarkdown = (content: string): string => {
  return content
    // Remove headings but keep other content
    .replace(/^#{1,6}\s+.*$/gm, '')
    // Strip inline formatting but keep the text
    .replace(/\*\*(.+?)\*\*/g, '$1')      // Bold
    .replace(/\*(.+?)\*/g, '$1')          // Italic
    .replace(/_(.+?)_/g, '$1')            // Italic underscore
    .replace(/`(.+?)`/g, '$1')            // Inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')   // Links (keep text)
    .replace(/^\s*[-*+]\s+/gm, '')        // List markers
    .replace(/^\s*\d+\.\s+/gm, '')        // Numbered list markers
    .replace(/^>\s+/gm, '')               // Blockquotes
    // Remove chord notations
    .replace(/\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
