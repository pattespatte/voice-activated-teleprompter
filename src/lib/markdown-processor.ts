import { marked } from "marked"
import { injectWordSpans } from "./html-word-injector"
import type { TextElement } from "./word-tokenizer"

// Configure marked options for teleprompter use case
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
})

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

// ChordPro directive patterns
// Matches: {directive: value}, {directive value}, {directive}
// The `m` flag lets it match a directive on any line, not just when the
// whole content is a single directive.
const DIRECTIVE_REGEX = /^\s*\{(\w+)\s*(?::\s*(.*?))?\s*\}\s*$/m
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
 * Parses ChordPro directives from content into a key-value object.
 * Supports both {key: value} and {key value} forms.
 * Meta directives like {meta: source_url http://...} are flattened to meta_source_url.
 */
export const parseChordProDirectives = (content: string): Record<string, string> => {
  const meta: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(DIRECTIVE_REGEX)
    if (match) {
      const [, directive, value] = match
      const trimmedValue = value?.trim() ?? ''
      if (directive === 'meta' && trimmedValue) {
        // {meta: source http://...} → source
        // Also handles legacy {meta: source_url http://...} → source
        const spaceIdx = trimmedValue.indexOf(' ')
        if (spaceIdx > 0) {
          const metaKey = trimmedValue.substring(0, spaceIdx).trim()
          const metaValue = trimmedValue.substring(spaceIdx + 1).trim()
          // Normalize: source_url → source
          const normalizedKey = metaKey === 'source_url' ? 'source' : metaKey
          meta[normalizedKey] = metaValue
        }
      } else if (trimmedValue) {
        // {title: My Song} → title: "My Song"
        // Also store aliases: {t: ...} → title, {st: ...} → subtitle, {c: ...} → comment
        const key = expandDirectiveAlias(directive)
        if (!meta[key]) {
          meta[key] = trimmedValue
        }
      }
    }
  }

  return meta
}

/**
 * Expands ChordPro directive aliases to their full names
 */
const expandDirectiveAlias = (directive: string): string => {
  const aliases: Record<string, string> = {
    t: 'title',
    st: 'subtitle',
    c: 'comment',
    soc: 'start_of_chorus',
    eoc: 'end_of_chorus',
    sov: 'start_of_verse',
    eov: 'end_of_verse',
    sot: 'start_of_tab',
    eot: 'end_of_tab',
  }
  return aliases[directive] ?? directive
}

/**
 * Unified metadata parser: reads both YAML frontmatter and ChordPro directives.
 * ChordPro directives take precedence over YAML frontmatter for the same key.
 */
export const parseAllMetadata = (content: string): Record<string, string> => {
  const yamlMeta = parseFrontmatter(content)
  const chordProMeta = parseChordProDirectives(content)
  return { ...yamlMeta, ...chordProMeta }
}

/**
 * Strips ChordPro directives from content, converting comment directives
 * to markdown headers and removing all other directives.
 */
const stripChordProDirectives = (content: string): string => {
  const lines = content.split('\n')
  const result: string[] = []

  for (const line of lines) {
    const match = line.match(DIRECTIVE_REGEX)
    if (match) {
      const [, directive, value] = match
      const key = expandDirectiveAlias(directive)

      // Convert title directive to h1 header
      if (key === 'title' && value?.trim()) {
        result.push(`# ${value.trim()}`)
      }
      // Convert comment/section directives to h2 headers
      else if (key === 'comment' && value?.trim()) {
        result.push(`## ${value.trim()}`)
      } else if (key === 'start_of_chorus') {
        result.push('## Chorus')
      } else if (key === 'start_of_verse' && value?.trim()) {
        result.push(`## ${value.trim()}`)
      } else if (key === 'start_of_tab' && value?.trim()) {
        result.push(`## ${value.trim()}`)
      }
      // All other directives (key, meta, etc.) are silently removed
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * Detects if content is markdown by checking for common markdown patterns
 * or ChordPro directives
 */
export const isMarkdownContent = (content: string): boolean => {
  // YAML frontmatter (--- ... ---) counts on its own; check before stripping.
  if (FRONTMATTER_REGEX.test(content)) return true

  const stripped = stripFrontmatter(content)

  // Check for ChordPro directives
  if (DIRECTIVE_REGEX.test(stripped)) return true

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
    CHORD_REGEX, // ChordPro inline chords [G], [Cmaj7], etc.
  ]

  return markdownPatterns.some(pattern => pattern.test(stripped))
}

/**
 * Narrower check used to decide whether to show the "ChordPro syntax detected"
 * confirmation banner. Returns true only for ChordPro markers or YAML
 * frontmatter — not for plain markdown (headers, bold, …).
 */
export const hasChordProOrFrontmatter = (content: string): boolean => {
  return (
    FRONTMATTER_REGEX.test(content)
    || DIRECTIVE_REGEX.test(stripFrontmatter(content))
    || CHORD_REGEX.test(content)
  )
}

/**
 * Converts markdown content to HTML for display
 */
export const markdownToHtml = async (content: string): Promise<string> => {
  try {
    const result = await marked(processForDisplay(content))
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
    const processedContent = processChords(processForDisplay(content))
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
    const processedContent = processChords(processForDisplay(content))
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
 * Prepares content for display: strips YAML frontmatter and processes ChordPro directives.
 */
const processForDisplay = (content: string): string => {
  return stripChordProDirectives(stripFrontmatter(content))
}

const CHORD_REGEX = /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add|6|11|13)?(?:\/[A-G][#b]?)?\]/
const CHORD_REGEX_GLOBAL = /\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add|6|11|13)?(?:\/[A-G][#b]?)?\]/g

/**
 * Processes chords in ChordPro inline format [G]word.
 * Uses HTML <ruby> elements to position chords above words natively.
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
    const pendingChords: string[] = []

    const emitRuby = (word: string): string => {
      const chordText = pendingChords.join(' / ')
      pendingChords.length = 0
      hasChords = true
      return `<ruby>${word}<rt>${chordText}</rt></ruby>`
    }

    while (remaining.length > 0) {
      const match = remaining.match(CHORD_REGEX)

      if (!match || match.index === undefined) {
        // No more chords — attach pending chords to first word in remaining
        if (pendingChords.length > 0) {
          const wordMatch = remaining.match(/^(\S+)(.*)/)
          if (wordMatch) {
            result += emitRuby(wordMatch[1]) + wordMatch[2]
          } else {
            result += emitRuby(' ')
          }
        } else {
          result += remaining
        }
        break
      }

      // Emit text before the chord
      if (match.index > 0) {
        const before = remaining.substring(0, match.index)
        if (pendingChords.length > 0) {
          // Attach pending chords to first word in 'before'
          const wordMatch = before.match(/^(\S+)(.*)/)
          if (wordMatch && wordMatch[1].length > 0) {
            result += emitRuby(wordMatch[1]) + wordMatch[2]
          } else {
            result += before
          }
        } else {
          result += before
        }
      }

      // Buffer the chord
      pendingChords.push(match[0].slice(1, -1))
      hasChords = true
      remaining = remaining.substring(match.index + match[0].length)
    }

    // Handle trailing chords at end of line
    if (pendingChords.length > 0) {
      result += emitRuby(' ')
    }

    processedLines.push(hasChords ? `<span class="has-chords">${result}</span>` : line)
  }

  return processedLines.join('\n')
}

/**
 * Strips markdown formatting and ChordPro content to get plain text for speech recognition
 */
export const stripMarkdown = (content: string): string => {
  return stripChordProDirectives(stripFrontmatter(content))
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
    .replace(/\[[A-G][#b]?(?:maj|min|dim|aug|m|M|7|9|sus|add|6|11|13)?(?:\/[A-G][#b]?)?\]/g, '')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
