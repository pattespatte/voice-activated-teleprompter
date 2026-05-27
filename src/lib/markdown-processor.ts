import { marked } from "marked"
import { injectWordSpans } from "./html-word-injector"
import type { TextElement } from "./word-tokenizer"

// Configure marked options for teleprompter use case
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
})

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/

/**
 * Strips YAML frontmatter (---...---) from content
 */
export const stripFrontmatter = (content: string): string => {
  return content.replace(FRONTMATTER_REGEX, '')
}

/**
 * Parses YAML frontmatter into a key-value object
 */
export const parseFrontmatter = (content: string): Record<string, string> => {
  const match = content.match(FRONTMATTER_REGEX)
  if (!match) return {}

  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.substring(0, colonIdx).trim()
      const value = line.substring(colonIdx + 1).trim()
      if (key && value) meta[key] = value
    }
  }
  return meta
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
 * Outputs two visual rows: chord row (monospace, positioned) above lyrics row.
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

    // Parse chord positions and build lyrics string
    const chordPositions: { charPos: number; chord: string }[] = []
    let lyrics = ''
    let remaining = line
    let hasChords = false

    while (remaining.length > 0) {
      const match = remaining.match(CHORD_REGEX)

      if (!match || match.index === undefined) {
        lyrics += remaining
        break
      }

      const chord = match[0].slice(1, -1)
      lyrics += remaining.substring(0, match.index)
      remaining = remaining.substring(match.index + match[0].length)

      // Skip whitespace after chord
      remaining = remaining.replace(/^\s*/, '')

      const wordMatch = remaining.match(/^(\S+)/)
      if (wordMatch) {
        chordPositions.push({ charPos: lyrics.length, chord })
        lyrics += wordMatch[1]
        remaining = remaining.substring(wordMatch[1].length)
        hasChords = true
      } else {
        chordPositions.push({ charPos: lyrics.length, chord })
        hasChords = true
      }
    }

    if (hasChords) {
      // Build chord row with spaces to position each chord above its word
      let chordRow = ''
      for (const { charPos, chord } of chordPositions) {
        const spaces = Math.max(0, charPos - chordRow.length)
        chordRow += ' '.repeat(spaces) + chord
      }

      processedLines.push(
        `<span class="has-chords">` +
        `<span class="chord-row">${chordRow}</span>\n` +
        `${lyrics}` +
        `</span>`
      )
    } else {
      processedLines.push(line)
    }
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
