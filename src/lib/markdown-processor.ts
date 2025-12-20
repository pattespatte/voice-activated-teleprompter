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
    // Remove chords like [G], [C], [G7], [Am], [F#m], etc. completely
    .replace(/\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add)?(?:\/[A-G][#b]?)?\]/g, '')
    // Remove metadata like [**Key:** G Major] and [**Time:** 3/4 (Waltz)]
    .replace(/\[\*\*Key:\*\*.*?\]/g, '')
    .replace(/\[\*\*Time:\*\*.*?\]/g, '')
    // Remove other metadata in brackets [**...**]
    .replace(/\[\*\*.*?\*\*.*?\]/g, '')
    // Remove headers (# ## ### etc.) but keep the content
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold (**text**) but keep the text content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    // Remove italic (*text*) but keep the text content
    .replace(/\*(.*?)\*/g, '$1')
    // Remove italic with underscores (_text_) but keep the text content
    .replace(/_(.*?)_/g, '$1')
    // Remove inline code (`code`) but keep the content
    .replace(/`(.*?)`/g, '$1')
    // Remove links [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove list markers (-, *, +) but keep the content
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove ordered list markers (1., 2., etc.) but keep the content
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove blockquotes (>) but keep the content
    .replace(/^>\s+/gm, '')
    // Remove extra whitespace and normalize line breaks
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
