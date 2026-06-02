import { type TextElement, tokenize } from "./word-tokenizer"
import { levenshteinDistance } from "./levenshtein"

// Robust algorithm to match recognized speech to reference text.
// Uses sliding-window Levenshtein distance comparison instead of prefix matching.

const CONFIDENCE_THRESHOLD = 0.50  // max edit distance as fraction of comparison string length — sung text needs generous threshold (slurred, mispronounced)
const FORWARD_BIAS = 0.15  // per-token penalty for matches behind lastKnownPosition — helps with repeated lyrics

/**
 * Searches for the best matching position using a sliding window approach.
 * Compares the recognized text against each same-length substring in the reference.
 */
const findBestMatch = (
  comparison_string: string,
  recognizedCount: number,
  reference: TextElement[],
  startIndex: number,
  windowSize: number,
  lastKnownPosition: number,
  debug: boolean,
): { index: number; distance: number } => {
  const reference_tokens = reference
    .slice(startIndex, startIndex + windowSize)
    .filter(element => element.type === "TOKEN")

  if (reference_tokens.length === 0) {
    return { index: -1, distance: Infinity }
  }

  if (debug) {
    console.log("  reference_tokens:", reference_tokens.slice(0, 20).map(t => t.value).join(" ") + (reference_tokens.length > 20 ? "..." : ""))
  }

  // Sliding window: compare recognized text against each substring of same length
  const distances: number[] = []
  const adjustedDistances: number[] = []  // distances with forward-position bias applied
  const windowLen = Math.min(recognizedCount, reference_tokens.length)

  for (let start = 0; start <= reference_tokens.length - windowLen; start++) {
    const reference_substring = reference_tokens
      .slice(start, start + windowLen)
      .reduce((acc, tok) => acc + " " + tok.value, "")
      .replace(/\s+/, " ")
      .trim()
    const dist = levenshteinDistance(comparison_string, reference_substring)
    distances.push(dist)

    // Apply forward bias: penalize matches that would move position backward
    const matchEndToken = reference_tokens[start + windowLen - 1]
    const tokensBack = lastKnownPosition - matchEndToken.index
    const bias = tokensBack > 0 ? tokensBack * FORWARD_BIAS : 0
    adjustedDistances.push(dist + bias)
  }

  // Also try growing prefix from start (helps when recognized is first words)
  for (let len = 1; len <= Math.min(recognizedCount * 2, reference_tokens.length); len++) {
    const prefix = reference_tokens
      .slice(0, len)
      .reduce((acc, tok) => acc + " " + tok.value, "")
      .replace(/\s+/, " ")
      .trim()
    const dist = levenshteinDistance(comparison_string, prefix)
    distances.push(dist)

    const matchEndToken = reference_tokens[len - 1]
    const tokensBack = lastKnownPosition - matchEndToken.index
    const bias = tokensBack > 0 ? tokensBack * FORWARD_BIAS : 0
    adjustedDistances.push(dist + bias)
  }

  // Use adjusted distances for picking best match, raw distances for threshold check
  const minAdjDist = Math.min(...adjustedDistances)
  const bestAdjIndex = adjustedDistances.indexOf(minAdjDist)
  const minDist = distances[bestAdjIndex]  // raw distance at best adjusted position
  const threshold = comparison_string.length * CONFIDENCE_THRESHOLD

  if (debug) {
    console.log("  Min distance:", minDist, "Threshold:", threshold.toFixed(1))
  }

  if (minDist > threshold) {
    if (debug) {
      console.log("  Match rejected — below confidence threshold")
    }
    return { index: -1, distance: minDist }
  }

  const bestIndex = bestAdjIndex

  // Map back from distances index to reference token index.
  // Sliding window entries come first, then prefix entries.
  const slidingCount = reference_tokens.length - windowLen + 1
  let token: TextElement

  if (bestIndex < slidingCount) {
    // Match is in the sliding window — the matched substring ends at bestIndex + windowLen - 1
    token = reference_tokens[bestIndex + windowLen - 1]
  } else {
    // Match is in the prefix section
    const prefixLen = bestIndex - slidingCount + 1
    token = reference_tokens[prefixLen - 1]
  }

  if (debug) {
    console.log("  Best match index:", bestIndex, "→ token index:", token.index)
  }

  return { index: token.index, distance: minDist }
}

export const computeSpeechRecognitionTokenIndex = (
  recognized: string,
  reference: TextElement[],
  lastRecognizedTokenIndex: number,
) => {
  const debug = process.env.NODE_ENV === 'development'

  if (debug) {
    console.log("=== speech-matcher.ts ===")
    console.log("Input recognized:", recognized)
    console.log("lastRecognizedTokenIndex:", lastRecognizedTokenIndex)
  }

  const recognized_tokens = tokenize(recognized).filter(
    element => element.type === "TOKEN",
  )

  if (debug) {
    console.log("recognized_tokens:", recognized_tokens.map(t => t.value))
  }

  if (recognized_tokens.length === 0) {
    return lastRecognizedTokenIndex
  }

  const comparison_string = recognized_tokens
    .reduce((acc, tok) => acc + " " + tok.value, "")
    .replace(/\s+/, " ")
    .trim()

  if (debug) {
    console.log("comparison_string:", comparison_string)
  }

  let startIndex = Math.max(0, lastRecognizedTokenIndex)

  // Step 1: Normal forward search with lookback for stale context
  // comparison_string may contain words from before lastRecognizedTokenIndex
  // (accumulated in recentFinalWords). Include lookback so they can match.
  const lookback = recognized_tokens.length
  const normalStart = Math.max(0, startIndex - lookback)
  const normalWindow = Math.max(recognized_tokens.length * 3, 30) + lookback
  if (debug) {
    console.log("Normal search: start=", normalStart, "window=", normalWindow)
  }

  const normalMatch = findBestMatch(
    comparison_string, recognized_tokens.length, reference, normalStart, normalWindow, lastRecognizedTokenIndex, debug,
  )
  if (normalMatch.index >= 0) {
    if (debug) console.log("========================")
    return normalMatch.index
  }

  // Step 2: Recovery — wider window including tokens before last position
  const recoveryLookback = 50
  const recoveryLookahead = Math.max(recognized_tokens.length * 6, 120)
  const recoveryStart = Math.max(0, startIndex - recoveryLookback)

  if (debug) {
    console.log("Recovery search: start=", recoveryStart, "window=", recoveryLookback + recoveryLookahead)
  }

  const recoveryMatch = findBestMatch(
    comparison_string, recognized_tokens.length, reference, recoveryStart, recoveryLookback + recoveryLookahead, lastRecognizedTokenIndex, debug,
  )
  if (recoveryMatch.index >= 0) {
    if (debug) console.log("========================")
    return recoveryMatch.index
  }

  if (debug) {
    console.log("No confident match found, staying at:", lastRecognizedTokenIndex)
    console.log("========================")
  }
  return lastRecognizedTokenIndex
}
