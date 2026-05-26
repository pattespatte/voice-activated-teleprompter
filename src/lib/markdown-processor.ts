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

const isChordOnlyLine = (line: string): boolean => {
  CHORD_REGEX_GLOBAL.lastIndex = 0
  if (!CHORD_REGEX_GLOBAL.test(line)) return false
  const stripped = line.replace(CHORD_REGEX_GLOBAL, '').trim()
  CHORD_REGEX_GLOBAL.lastIndex = 0
  return stripped.length === 0
}

const mergeChordLineWithLyrics = (chordLine: string, lyricsLine: string): string => {
  const chords: { column: number; chord: string }[] = []
  let remaining = chordLine
  let offset = 0

  while (remaining.length > 0) {
    const match = remaining.match(CHORD_REGEX)
    if (!match || match.index === undefined) break

    chords.push({
      column: offset + match.index,
      chord: match[0].slice(1, -1),
    })

    offset += match.index + match[0].length
    remaining = remaining.substring(match.index + match[0].length)
  }

  if (chords.length === 0) return lyricsLine

  const words: { start: number; end: number; text: string }[] = []
  for (let j = 0; j < lyricsLine.length;) {
    if (/\S/.test(lyricsLine[j])) {
      const start = j
      while (j < lyricsLine.length && /\S/.test(lyricsLine[j])) j++
      words.push({ start, end: j, text: lyricsLine.substring(start, j) })
    } else {
      j++
    }
  }

  if (words.length === 0) return lyricsLine

  // Map each chord to the nearest word by column position
  const chordMap = new Map<number, string[]>()
  for (const { column, chord } of chords) {
    let bestIdx = 0
    let bestDist = Math.abs(words[0].start - column)

    for (let w = 1; w < words.length; w++) {
      const dist = Math.abs(words[w].start - column)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = w
      }
    }

    if (!chordMap.has(bestIdx)) chordMap.set(bestIdx, [])
    chordMap.get(bestIdx)!.push(chord)
  }

  let result = ''
  for (let w = 0; w < words.length; w++) {
    const prevEnd = w > 0 ? words[w - 1].end : 0
    result += lyricsLine.substring(prevEnd, words[w].start)

    if (chordMap.has(w)) {
      const chordSpans = chordMap
        .get(w)!
        .map(c => `<span class="chord">${c}</span>`)
        .join('')
      result += `<span class="chord-word">${chordSpans}${words[w].text}</span>`
    } else {
      result += words[w].text
    }
  }

  if (words.length > 0) {
    result += lyricsLine.substring(words[words.length - 1].end)
  }

  return `<span class="has-chords">${result}</span>`
}

/**
 * Processes chords in ChordPro format [G], [C], etc.
 * Handles both two-line format (chords on line above lyrics) and inline format.
 * Positions chords above the word they precede by wrapping word + chord in a container.
 */
const processChords = (content: string): string => {
  const lines = content.split('\n')
  const processedLines: string[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Two-line format: chord-only line above lyrics line
    if (
      isChordOnlyLine(line) &&
      i + 1 < lines.length &&
      !isChordOnlyLine(lines[i + 1]) &&
      lines[i + 1].trim().length > 0
    ) {
      processedLines.push(mergeChordLineWithLyrics(line, lines[i + 1]))
      i += 2
      continue
    }

    // Inline chord processing
    CHORD_REGEX_GLOBAL.lastIndex = 0
    if (!CHORD_REGEX_GLOBAL.test(line)) {
      processedLines.push(line)
      i++
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

      const chordIndex = chordMatch.index
      const chord = chordMatch[0].slice(1, -1)

      result += remaining.substring(0, chordIndex)
      remaining = remaining.substring(chordIndex + chordMatch[0].length)

      const afterChord = remaining.replace(/^(\s*)/, '')
      const leadingWhitespace = RegExp.$1

      let skipped = afterChord
      let skipMatch
      while ((skipMatch = skipped.match(CHORD_REGEX)) && skipMatch.index === 0) {
        result += `<span class="chord-word"><span class="chord">${skipMatch[0].slice(1, -1)}</span></span>`
        skipped = skipped.substring(skipMatch[0].length).replace(/^\s*/, '')
      }

      const wordMatch = skipped.match(/^(\S+)/)
      if (wordMatch) {
        const word = wordMatch[1]
        remaining = skipped.substring(word.length)
        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span>${word}</span>`
        hasChords = true
      } else {
        result += `${leadingWhitespace}<span class="chord-word"><span class="chord">${chord}</span></span>`
        remaining = skipped
        hasChords = true
      }
    }

    if (hasChords) {
      processedLines.push(`<span class="has-chords">${result}</span>`)
    } else {
      processedLines.push(result)
    }
    i++
  }

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
