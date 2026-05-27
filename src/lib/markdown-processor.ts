import { marked } from "marked"
import { injectWordSpans } from "./html-word-injector"
import type { TextElement } from "./word-tokenizer"

// Configure marked options for teleprompter use case
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
})

const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---\n?/

/**
 * Strips YAML frontmatter (---...---) from content
 */
export const stripFrontmatter = (content: string): string => {
  return content.replace(FRONTMATTER_REGEX, '')
}

/**
 * Detects if content is markdown by checking for common markdown patterns
 */
export const isMarkdownContent = (content: string): boolean => {
  const stripped = stripFrontmatter(content)

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

  return markdownPatterns.some(pattern => pattern.test(stripped))
}

/**
 * Converts markdown content to HTML for display
 */
export const markdownToHtml = async (content: string): Promise<string> => {
  try {
    const result = await marked(stripFrontmatter(content))
    return result
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error parsing markdown:", error)
    }
    return content
  }
}

/**
 * Synchronous version of markdownToHtml for backward compatibility
 */
export const markdownToHtmlSync = (content: string): string => {
  try {
    const processedContent = processChords(stripFrontmatter(content))
    return marked.parse(processedContent) as string
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error parsing markdown:", error)
    }
    return content
  }
}

/**
 * Converts markdown to HTML with clickable word spans for index mapping
 */
export const markdownToHtmlWithWordSpans = (content: string, textElements: TextElement[]): string => {
  try {
    const processedContent = processChords(stripFrontmatter(content))
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
 * Processes chords in ChordPro inline format [G]word.
 * Wraps chord + following word in .chord-word span for CSS stacking.
 */
const processChords = (content: string): string => {
  const lines = content.split('\n')
  const processedLines: string[] = []

  for (const line of lines) {
    CHORD_REGEX_GLOBAL.lastIndex = 0
    if (!CHORD_REGEX_GLOBAL.test(line)) {
      processedLines.push(line)
      continue
    }
    CHORD_REGEX_GLOBAL.lastIndex = 0

    let result = ''
    let remaining = line
    let hasChords = false

    while (remaining.length > 0) {
      const chordMatch = remaining.match(CHORD_REGEX)

      if (!chordMatch || chordMatch.index === undefined) {
        result += remaining
        break
      }

      const chord = chordMatch[0].slice(1, -1)

      // Add text before the chord
      result += remaining.substring(0, chordMatch.index)
      remaining = remaining.substring(chordMatch.index + chordMatch[0].length)

      // Skip whitespace after chord
      const afterChord = remaining.replace(/^(\s*)/, '')
      const leadingWhitespace = RegExp.$1

      // Skip consecutive chords with no word between
      let skipped = afterChord
      let skipMatch
      while ((skipMatch = skipped.match(CHORD_REGEX)) && skipMatch.index === 0) {
        result += `<span class="chord-word"><span class="chord">${skipMatch[0].slice(1, -1)}</span></span>`
        skipped = skipped.substring(skipMatch[0].length).replace(/^\s*/, '')
      }

      const wordMatch = skipped.match(/^(\S+)/)
      if (wordMatch) {
        remaining = skipped.substring(wordMatch[1].length)
        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span>${wordMatch[1]}</span>`
        hasChords = true
      } else {
        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span></span>`
        remaining = skipped
        hasChords = true
      }
    }

    processedLines.push(hasChords ? `<span class="has-chords">${result}</span>` : result)
  }

  return processedLines.join('\n')
}

/**
 * Strips markdown formatting to get plain text for speech recognition
 */
export const stripMarkdown = (content: string): string => {
  return stripFrontmatter(content)
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
