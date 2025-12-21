// Test script to understand the auto scrolling issue with plain text files

// First, let's simulate what happens when we load the amazing-grace.txt file
const plainTextContent = `[1] Amazing grace (how sweet the sound)
that saved a wretch like me!
I once was lost, but now am found,
was blind, but now I see.

[2] 'Twas grace that taught my heart to fear,
and grace my fears relieved;
how precious did that grace appear
the hour I first believed!

[3] Through many dangers, toils and snares
I have already come:
'tis grace has brought me safe thus far,
and grace will lead me home.

[4] The Lord has promised good to me,
his word my hope secures;
he will my shield and portion be
as long as life endures.

[5] Yes, when this flesh and heart shall fail,
and mortal life shall cease:
I shall possess, within the veil,
a life of joy and peace.

[6] The earth shall soon dissolve like snow,
the sun forbear to shine;
but God, who called me here below,
will be forever mine.`;

// Import the tokenize function (we'll need to simulate this)
// For now, let's just analyze the structure

console.log("=== Plain Text Analysis ===");
console.log("Total lines:", plainTextContent.split('\n').length);
console.log("First few lines:");
plainTextContent.split('\n').slice(0, 5).forEach((line, i) => {
  console.log(`${i + 1}: "${line}"`);
});

console.log("\n=== Looking for patterns ===");
// Check for bracketed content like [1], [2], etc.
const bracketMatches = plainTextContent.match(/\[[^\]]+\]/g);
console.log("Bracketed content:", bracketMatches?.slice(0, 10));

// Check if there are any special characters that might affect tokenization
const specialChars = plainTextContent.match(/[^\w\s\[\]\(\),.!?;:'"\/\\-]/g);
console.log("Special characters:", specialChars?.slice(0, 10));

// Let's see what the tokenizer would produce
console.log("\n=== Tokenization simulation ===");
// This is a simplified version of what the tokenizer does
function simpleTokenize(text) {
  const results = [];
  let current = null;
  let i = 0;
  
  while (i < text.length) {
    let s = text[i];
    let inToken;
    
    // Special case for text within [ and ]
    if (s === "[") {
      const hintLength = text.substring(i).indexOf("]");
      s = hintLength > 0 ? text.substring(i, i + hintLength + 1) : s.substring(i);
      inToken = false;
    } else {
      inToken = /[A-Za-zÀ-ÿА-Яа-я0-9_]/.test(s);
    }
    
    if (current === null) {
      current = {
        type: inToken ? "TOKEN" : "DELIMITER",
        value: s,
        index: 0,
      };
    } else if (
      (current.type === "TOKEN" && inToken) ||
      (current.type === "DELIMITER" && !inToken)
    ) {
      current.value += s;
    } else {
      let lastIndex = current.index;
      results.push(current);
      current = {
        type: inToken ? "TOKEN" : "DELIMITER",
        value: s,
        index: lastIndex + 1,
      };
    }
    
    i += s.length;
  }
  
  if (current !== null) {
    results.push(current);
  }
  
  return results;
}

const tokens = simpleTokenize(plainTextContent);
console.log("Total tokens:", tokens.length);
console.log("First 20 tokens:");
tokens.slice(0, 20).forEach((token, i) => {
  console.log(`${i}: ${token.type}: "${token.value}" (index: ${token.index})`);
});

// Check for any tokens that might cause scrolling issues
console.log("\n=== Potential scrolling issues ===");
const bracketTokens = tokens.filter(t => t.value.includes('[') && t.value.includes(']'));
console.log("Bracket tokens:", bracketTokens.slice(0, 10));

const newlineTokens = tokens.filter(t => t.value.includes('\n'));
console.log("Newline tokens count:", newlineTokens.length);
console.log("First few newline tokens:");
newlineTokens.slice(0, 5).forEach((token, i) => {
  console.log(`${i}: "${token.value.replace(/\n/g, '\\n')}" (index: ${token.index})`);
});