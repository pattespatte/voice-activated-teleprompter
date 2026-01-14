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

/**
 * Processes chords in the format [G], [C], etc. and converts them to styled HTML
 */
const processChords = (content: string): string => {
  // Replace chord notation [G] with styled spans
  return content.replace(
    /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g,
    match => {
      const chord = match.slice(1, -1) // Remove brackets
      return `<span class="chord">${chord}</span>`
    },
  )
}

/**
 * Strips markdown formatting to get plain text for speech recognition
 */
export const stripMarkdown = (content: string): string => {
  const lines = content.split("\n")
  const filteredLines = lines.filter(line => {
    const trimmedLine = line.trim()

    // Skip empty lines
    if (!trimmedLine) {
      return false
    }

    // Skip headings (## Verse 1, etc.)
    if (/^#{1,6}\s+/.test(trimmedLine)) {
      return false
    }

    // Skip lines with markdown formatting patterns
    const markdownPatterns = [
      /\*\*.*?\*\*/, // Bold text
      /\*.*?\*/, // Italic text
      /_.*?_/, // Italic text (underscore)
      /`.*?`/, // Inline code
      /\[.*?\]\(.*?\)/, // Links
      /^\s*[-*+]\s+/, // Unordered list markers
      /^\s*\d+\.\s+/, // Ordered list markers
      /^>\s+/, // Blockquotes
      /^\s*\[.*\]\s*$/, // Entire line in brackets (including chords)
    ]

    // Skip if any markdown pattern is found on this line
    for (const pattern of markdownPatterns) {
      if (pattern.test(trimmedLine)) {
        return false
      }
    }

    // Skip chord-only lines (lines that are mostly chords)
    const chordCount = (
      trimmedLine.match(
        /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g,
      ) || []
    ).length
    const nonChordContent = trimmedLine
      .replace(
        /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g,
        "",
      )
      .trim()
    if (chordCount > 0 && nonChordContent.length === 0) {
      return false
    }

    return true
  })

  return filteredLines.join("\n").trim()
}
