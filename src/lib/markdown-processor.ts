import { marked } from 'marked'

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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing markdown:', error)
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
    if (process.env.NODE_ENV === 'development') {
      console.error('Error parsing markdown:', error)
    }
    return content // Return original content if parsing fails
  }
}

/**
 * Processes chords in the format [G], [C], etc. and converts them to styled HTML
 */
const processChords = (content: string): string => {
  // Replace chord notation [G] with styled spans
  return content.replace(/\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g, (match) => {
    const chord = match.slice(1, -1) // Remove brackets
    return `<span class="chord">${chord}</span>`
  })
}

/**
 * Strips markdown formatting to get plain text for speech recognition
 */
export const stripMarkdown = (content: string): string => {
  return content
    // Remove chords [G], [C], etc.
    .replace(/\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g, '')
    // Remove metadata like [**Key:** G Major] and [**Time:** 3/4 (Waltz)]
    .replace(/\[\*\*Key:\*\*.*?\]/g, '')
    .replace(/\[\*\*Time:\*\*.*?\]/g, '')
    // Remove headers (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text**)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic (*text* or _text_)
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code (`code`)
    .replace(/`(.*?)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove extra line breaks
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
