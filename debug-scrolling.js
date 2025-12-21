// Debug script to understand scrolling issue

// Let's simulate what happens when we have the amazing-grace.txt content
const plainTextContent = `[1] Amazing grace (how sweet the sound)
that saved a wretch like me!
I once was lost, but now am found,
was blind, but now I see.`;

// Simulate the tokenize function behavior
function tokenize(text) {
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

const textElements = tokenize(plainTextContent);

console.log("=== Text Elements Analysis ===");
console.log("Total text elements:", textElements.length);

// Let's look at the first few elements
console.log("\nFirst 10 text elements:");
textElements.slice(0, 10).forEach((el, i) => {
  console.log(`${i}: type=${el.type}, value="${el.value.replace(/\n/g, '\\n')}", index=${el.index}`);
});

// Now let's simulate what happens during scrolling
// The scrolling logic looks for an element with index === currentTranscriptIndex + 1
function simulateScrolling(currentTranscriptIndex) {
  const targetIndex = currentTranscriptIndex + 1;
  const targetElement = textElements.find(el => el.index === targetIndex);
  
  console.log(`\n=== Simulating scroll for transcript index ${currentTranscriptIndex} ===`);
  console.log(`Looking for element with index ${targetIndex}`);
  
  if (targetElement) {
    console.log(`Found: type=${targetElement.type}, value="${targetElement.value.replace(/\n/g, '\\n')}"`);
  } else {
    console.log("NOT FOUND!");
    
    // Let's see what indices we actually have
    const availableIndices = [...new Set(textElements.map(el => el.index))].sort((a, b) => a - b);
    console.log("Available indices:", availableIndices.slice(0, 20));
    console.log("Missing indices around target:", 
      Array.from({length: 10}, (_, i) => targetIndex + i).filter(i => !availableIndices.includes(i))
    );
  }
}

// Test with different transcript indices
simulateScrolling(-1); // Initial state
simulateScrolling(0);  // After first word
simulateScrolling(1);  // After second word
simulateScrolling(2);  // After third word
simulateScrolling(3);  // After fourth word
simulateScrolling(4);  // After fifth word

// Let's also check what happens with the actual scrolling logic
console.log("\n=== Scrolling Logic Analysis ===");
console.log("The scrolling logic in Content.tsx:");
console.log("1. Uses Math.max(finalTranscriptIndex, interimTranscriptIndex) to get currentTranscriptIndex");
console.log("2. Looks for element with index === currentTranscriptIndex + 1");
console.log("3. If found, scrolls to that element's position");

// Let's check if there's a pattern issue
console.log("\n=== Pattern Analysis ===");
const tokenElements = textElements.filter(el => el.type === "TOKEN");
const delimiterElements = textElements.filter(el => el.type === "DELIMITER");

console.log("Token elements count:", tokenElements.length);
console.log("Delimiter elements count:", delimiterElements.length);

console.log("\nFirst 5 TOKEN elements:");
tokenElements.slice(0, 5).forEach((el, i) => {
  console.log(`${i}: index=${el.index}, value="${el.value}"`);
});

console.log("\nFirst 5 DELIMITER elements:");
delimiterElements.slice(0, 5).forEach((el, i) => {
  console.log(`${i}: index=${el.index}, value="${el.value.replace(/\n/g, '\\n')}"`);
});