import { marked } from "marked"
import { injectWordSpans } from "./html-word-injector"
import type { TextElement } from "./word-tokenizer"

// Configure marked options for teleprompter use case
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true, // Enable GitHub Flavored Markdown
})

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

// Matches a single ChordPro directive line:
//   {directive}          — no argument
//   {directive: value}   — bare value (may contain spaces)
//   {directive: label="Verse 1"} — keyword argument(s)
// The `m` flag lets it match a directive on any line, not just when the
// whole content is a single directive.
const DIRECTIVE_REGEX = /^\s*\{(\w[\w-]*)\s*(?::\s*(.*?))?\s*\}\s*$/m

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

// ---------------------------------------------------------------------------
// ChordPro directive reference
// ---------------------------------------------------------------------------

/**
 * Full alias map for all ChordPro directives per
 * https://www.chordpro.org/chordpro/chordpro-directives/
 *
 * Maps short/long names to a canonical form. Names not present here are kept
 * as-is (so unknown directives are still recognized and consumed rather than
 * leaking raw text).
 */
const DIRECTIVE_ALIASES: Record<string, string> = {
  // Metadata / preamble
  t: 'title',
  title: 'title',
  st: 'subtitle',
  subtitle: 'subtitle',
  a: 'artist',
  artist: 'artist',
  c: 'comment',
  comment: 'comment',
  ci: 'comment_italic',
  comment_italic: 'comment_italic',
  cb: 'comment_box',
  comment_box: 'comment_box',
  ar: 'arranger',
  arranger: 'arranger',
  co: 'composer',
  composer: 'composer',
  ly: 'lyricist',
  lyricist: 'lyricist',
  cr: 'copyright',
  copyright: 'copyright',
  al: 'album',
  album: 'album',
  yr: 'year',
  year: 'year',
  key: 'key',
  time: 'time',
  tempo: 'tempo',
  duration: 'duration',
  capo: 'capo',
  meta: 'meta',
  tag: 'tag',
  sorttitle: 'sorttitle',
  sortartist: 'sortartist',
  ns: 'new_song',
  new_song: 'new_song',

  // Formatting / inline directives
  highlight: 'highlight',
  image: 'image',
  titlecolour: 'titlecolour',
  textcolour: 'textcolour',
  chordcolour: 'chordcolour',
  subtitlecolour: 'subtitlecolour',
  commentcolour: 'commentcolour',
  backgroundcolour: 'backgroundcolour',

  // Environments — paired open/close
  soc: 'start_of_chorus',
  start_of_chorus: 'start_of_chorus',
  eoc: 'end_of_chorus',
  end_of_chorus: 'end_of_chorus',
  sov: 'start_of_verse',
  start_of_verse: 'start_of_verse',
  eov: 'end_of_verse',
  end_of_verse: 'end_of_verse',
  sob: 'start_of_bridge',
  start_of_bridge: 'start_of_bridge',
  eob: 'end_of_bridge',
  end_of_bridge: 'end_of_bridge',
  sot: 'start_of_tab',
  start_of_tab: 'start_of_tab',
  eot: 'end_of_tab',
  end_of_tab: 'end_of_tab',
  sog: 'start_of_grid',
  start_of_grid: 'start_of_grid',
  eog: 'end_of_grid',
  end_of_grid: 'end_of_grid',

  // Delegated environments (ABC, LilyPond, SVG, text block)
  start_of_abc: 'start_of_abc',
  end_of_abc: 'end_of_abc',
  start_of_ly: 'start_of_ly',
  end_of_ly: 'end_of_ly',
  start_of_svg: 'start_of_svg',
  end_of_svg: 'end_of_svg',
  start_of_textblock: 'start_of_textblock',
  end_of_textblock: 'end_of_textblock',

  // Chord diagrams / instrument definitions
  define: 'define',
  chord: 'chord',
  diagrams: 'diagrams',
  no_diagrams: 'no_diagrams',

  // Transposition
  transpose: 'transpose',

  // Fonts / sizes
  cf: 'chordfont',
  chordfont: 'chordfont',
  cs: 'chordsize',
  chordsize: 'chordsize',
  tf: 'textfont',
  textfont: 'textfont',
  ts: 'textsize',
  textsize: 'textsize',
  tcf: 'titlefont',
  titlefont: 'titlefont',
  tcs: 'titlesize',
  titlesize: 'titlesize',
  stf: 'subtitlefont',
  subtitlefont: 'subtitlefont',
  sts: 'subtitlesize',
  subtitlesize: 'subtitlesize',
  cof: 'footerfont',
  footerfont: 'footerfont',
  cos: 'footersize',
  footersize: 'footersize',
  gtf: 'gridfont',
  gridfont: 'gridfont',
  gts: 'gridsize',
  gridsize: 'gridsize',

  // Page / layout
  np: 'new_page',
  new_page: 'new_page',
  npp: 'new_physical_page',
  new_physical_page: 'new_physical_page',
  colb: 'column_break',
  column_break: 'column_break',
  col: 'columns',
  columns: 'columns',
  pagetype: 'pagetype',
  pagesize: 'pagesize',

  // Legacy / miscellaneous
  g: 'grid',
  grid: 'grid',
  ng: 'no_grid',
  no_grid: 'no_grid',
  titles: 'titles',

  // Chorus replay
  chorus: 'chorus',

  // Misc recognized but silent
  gridlinewidth: 'gridlinewidth',
  gridcolour: 'gridcolour',
}

/**
 * Canonical name for a ChordPro directive, stripping any conditional selector
 * postfix (e.g. `comment-alto` → `comment`). The bare selector-less name is
 * what we route to a display behavior; selectors (`-soprano`, `-alto`, etc.)
 * are dropped per spec.
 */
const canonicalizeDirective = (raw: string): string => {
  const withoutSelector = raw.split('-')[0]
  const aliased = DIRECTIVE_ALIASES[withoutSelector] ?? withoutSelector
  return aliased
}

/**
 * Parses a directive's argument string into a label, handling both bare values
 * and HTML-attribute-style keyword arguments.
 *
 *   "Verse 1"                  → { label: "Verse 1" }
 *   'label="Verse 1"'          → { label: "Verse 1" }
 *   'label=\'Verse 1\''        → { label: "Verse 1" }
 *   'label=Verse 1'            → { label: "Verse 1" }
 *   'label="Verse 1" type="x"' → { label: "Verse 1", type: "x" }
 *   'type="x" label="Verse 1"' → { label: "Verse 1", type: "x" } (any order)
 *   ""                         → {}
 *
 * Per the ChordPro spec, a bare argument and `label="..."` are equivalent for
 * environment directives. We return only the `label` field for rendering.
 */
const parseDirectiveArgument = (
  arg: string | undefined,
): { label: string } => {
  const trimmed = arg?.trim() ?? ''
  if (!trimmed) return { label: '' }

  // Keyword-argument form: starts with `key=...`
  if (DIRECTIVE_KWARG_RE.test(trimmed)) {
    const kwargs = parseKwargs(trimmed)
    return { label: kwargs.label ?? '' }
  }

  // Bare value form — the whole string is the label
  return { label: trimmed }
}

// Matches the start of a keyword-argument string: `identifier = ...`
const DIRECTIVE_KWARG_RE = /^\w+\s*=/

/**
 * Parses an HTML-attribute-style kwargs string into a key→value map.
 * Handles single, double, and unquoted values, in any order.
 *
 *   'label="Verse 1"'          → { label: "Verse 1" }
 *   'label=Verse 1'            → { label: "Verse 1" }
 *   'type="x" label="Verse 1"' → { type: "x", label: "Verse 1" }
 */
const parseKwargs = (src: string): Record<string, string> => {
  const result: Record<string, string> = {}
  let i = 0
  while (i < src.length) {
    // Skip whitespace between kwargs
    while (i < src.length && /\s/.test(src[i])) i++
    if (i >= src.length) break

    // Read key (identifier chars)
    const keyStart = i
    while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) i++
    const key = src.substring(keyStart, i)
    if (!key) break

    // Skip whitespace and expect '='
    while (i < src.length && /\s/.test(src[i])) i++
    if (src[i] !== '=') break
    i++ // consume '='

    // Skip whitespace after '='
    while (i < src.length && /\s/.test(src[i])) i++

    // Read value — quoted or bare
    const quote = src[i]
    let value: string
    if (quote === '"' || quote === "'") {
      i++ // consume opening quote
      const valStart = i
      while (i < src.length && src[i] !== quote) i++
      value = src.substring(valStart, i)
      i++ // consume closing quote
    } else {
      // Unquoted: read until end of string. Unquoted kwarg values extend to
      // the end of the directive argument; they cannot be followed by another
      // kwarg without quoting. (Real ChordPro files use quotes when multiple
      // kwargs are needed, but tolerate `label=Verse 1` for single-arg case.)
      const valStart = i
      while (i < src.length) i++
      value = src.substring(valStart, i).trim()
    }
    result[key] = value
  }
  return result
}

/**
 * Parses ChordPro directives from content into a key-value object.
 * Supports both {key: value} and {key value} forms.
 * Meta directives like {meta: source_url http://...} are flattened to meta_source_url.
 *
 * Most metadata keys keep the first value found. `comment` is the exception: it
 * collects every occurrence (newline-joined) so mid-song performance cues are
 * not lost when hidden from the reading view.
 */
export const parseChordProDirectives = (content: string): Record<string, string> => {
  const meta: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const match = line.match(DIRECTIVE_REGEX)
    if (match) {
      const [, rawDirective, value] = match
      const directive = canonicalizeDirective(rawDirective)
      const { label } = parseDirectiveArgument(value)
      const trimmedLabel = label.trim()

      if (directive === 'meta' && value?.trim()) {
        // {meta: source http://...} → source
        // Also handles legacy {meta: source_url http://...} → source
        const spaceIdx = value.trim().indexOf(' ')
        if (spaceIdx > 0) {
          const metaKey = value.trim().substring(0, spaceIdx).trim()
          const metaValue = value.trim().substring(spaceIdx + 1).trim()
          // Normalize: source_url → source
          const normalizedKey = metaKey === 'source_url' ? 'source' : metaKey
          meta[normalizedKey] = metaValue
        }
      } else if (trimmedLabel && isMetadataDirective(directive)) {
        if (directive === 'comment') {
          // Comments can appear multiple times (top-of-file frontmatter plus
          // mid-song performance cues). Collect all of them so nothing is lost.
          meta.comment = meta.comment
            ? `${meta.comment}\n${trimmedLabel}`
            : trimmedLabel
        } else if (!meta[directive]) {
          meta[directive] = trimmedLabel
        }
      }
    }
  }

  return meta
}

/**
 * Directives whose argument is surfaced as song metadata in the info popover.
 * Note: `comment` collects every occurrence (newline-joined); other keys keep
 * the first value.
 */
const METADATA_DIRECTIVES = new Set([
  'title',
  'subtitle',
  'comment',
  'artist',
  'arranger',
  'composer',
  'lyricist',
  'copyright',
  'album',
  'year',
  'key',
  'time',
  'tempo',
  'duration',
  'capo',
])

const isMetadataDirective = (directive: string): boolean =>
  METADATA_DIRECTIVES.has(directive)

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
 * Environment directive pairs (canonical open → canonical close). Each open
 * directive has a matching close directive; content between them is the body.
 */
const ENVIRONMENT_OPENERS: Record<string, string> = {
  start_of_chorus: 'end_of_chorus',
  start_of_verse: 'end_of_verse',
  start_of_bridge: 'end_of_bridge',
  start_of_tab: 'end_of_tab',
  start_of_grid: 'end_of_grid',
  start_of_abc: 'end_of_abc',
  start_of_ly: 'end_of_ly',
  start_of_svg: 'end_of_svg',
  start_of_textblock: 'end_of_textblock',
}

const isEnvironmentOpener = (directive: string): boolean =>
  directive in ENVIRONMENT_OPENERS

const isEnvironmentCloser = (directive: string): boolean =>
  Object.values(ENVIRONMENT_OPENERS).includes(directive)

/**
 * Default label for an environment directive when no argument is provided.
 * E.g. bare `{start_of_verse}` → header "Verse".
 */
const ENVIRONMENT_DEFAULT_LABELS: Record<string, string> = {
  start_of_chorus: 'Chorus',
  start_of_verse: 'Verse',
  start_of_bridge: 'Bridge',
  start_of_tab: 'Tab',
  start_of_grid: 'Grid',
  start_of_abc: 'ABC',
  start_of_ly: 'LilyPond',
  start_of_svg: 'SVG',
  start_of_textblock: 'Text',
}

/**
 * Strips ChordPro directives from content, routing each to a display behavior:
 *
 * - SHOW: title, environment labels → markdown headers
 * - SILENT: subtitle, comment, metadata, fonts, page/layout, chord diagrams
 *          → consumed, not shown in the reading view (surfaced in the ℹ popover
 *          via parseChordProDirectives instead)
 * - ACT: chorus (replay last chorus), column_break/new_page (horizontal rule)
 * - IGNORE: x_* custom directives → dropped without warning (per spec)
 *
 * Only `title` and the structural section labels (chorus/verse/bridge/...) are
 * rendered as headers. All other metadata is popover-only.
 *
 * No directive should ever leak raw `{...}` text to the display.
 */
const stripChordProDirectives = (content: string): string => {
  const lines = content.split('\n')
  const result: string[] = []
  let lastChorusBody: string[] | null = null
  let insideChorus = false

  for (const line of lines) {
    const match = line.match(DIRECTIVE_REGEX)
    if (!match) {
      // Regular content line
      if (insideChorus && lastChorusBody !== null) {
        lastChorusBody.push(line)
      }
      result.push(line)
      continue
    }

    const [, rawDirective, value] = match
    const directive = canonicalizeDirective(rawDirective)

    // x_* custom directives: silently ignored
    if (rawDirective.startsWith('x_') || directive.startsWith('x_')) {
      continue
    }

    const { label } = parseDirectiveArgument(value)
    const trimmedLabel = label.trim()

    // --- SHOW: title (only metadata-style directive that renders as a header) ---
    if (directive === 'title' && trimmedLabel) {
      result.push(`# ${trimmedLabel}`)
      continue
    }

    // subtitle and comment fall through to SILENT below: they are popover-only
    // (see parseChordProDirectives). Environment section labels (chorus/verse/
    // bridge/...) are structural and still render as headers:

    // --- SHOW: environment openers ---
    if (isEnvironmentOpener(directive)) {
      const headerLabel =
        trimmedLabel ||
        ENVIRONMENT_DEFAULT_LABELS[directive] ||
        capitalize(directive.replace('start_of_', ''))
      result.push(`## ${headerLabel}`)

      if (directive === 'start_of_chorus') {
        lastChorusBody = []
        insideChorus = true
      }
      continue
    }

    // --- Environment closers ---
    if (isEnvironmentCloser(directive)) {
      insideChorus = false
      continue
    }

    // --- ACT: chorus replay ---
    if (directive === 'chorus') {
      if (lastChorusBody && lastChorusBody.length > 0) {
        result.push('## Chorus')
        result.push(...lastChorusBody)
      }
      continue
    }

    // --- ACT: column_break / new_page → horizontal rule ---
    // Emit a markdown thematic break. The surrounding blank lines are required
    // so marked.js does not parse the preceding line + `---` as a setext <h2>.
    if (directive === 'column_break' || directive === 'new_page') {
      result.push('')
      result.push('---')
      result.push('')
      continue
    }

    // --- SILENT: everything else (consumed, not shown) ---
  }

  return result.join('\n')
}

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1)

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
            result += emitRuby(' ')
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
      result += emitRuby(' ')
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
