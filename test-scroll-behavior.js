// Test to understand the scrolling behavior more deeply

// Let's simulate the exact scrolling logic from Content.tsx
function simulateScrollingBehavior(textElements, finalTranscriptIndex, interimTranscriptIndex) {
  console.log(`\n=== Simulating Scroll Behavior ===`);
  console.log(`finalTranscriptIndex: ${finalTranscriptIndex}, interimTranscriptIndex: ${interimTranscriptIndex}`);
  
  // Use the higher of final or interim transcript index
  const currentTranscriptIndex = Math.max(finalTranscriptIndex, interimTranscriptIndex);
  console.log(`currentTranscriptIndex: ${currentTranscriptIndex}`);
  
  // Only scroll forward, never backward
  // Update the max index we've scrolled to
  let maxScrollIndexRef = -1;
  
  if (currentTranscriptIndex > maxScrollIndexRef) {
    maxScrollIndexRef = currentTranscriptIndex;
    console.log(`Updated maxScrollIndexRef to: ${maxScrollIndexRef}`);
    
    // Find the element with the scroll index
    const targetElement = textElements.find(el => el.index === currentTranscriptIndex + 1);
    
    if (targetElement) {
      console.log(`Found target element: index=${targetElement.index}, type=${targetElement.type}, value="${targetElement.value.replace(/\n/g, '\\n')}"`);
      
      // Simulate the scroll position calculation
      const elementTop = 100; // Simulated offsetTop
      const scrollOffset = 200; // Simulated scrollOffset
      const scrollToPosition = elementTop - scrollOffset;
      const finalScrollPosition = Math.max(scrollToPosition, 0);
      
      console.log(`Scroll calculation: elementTop=${elementTop}, scrollOffset=${scrollOffset}`);
      console.log(`scrollToPosition=${scrollToPosition}, finalScrollPosition=${finalScrollPosition}`);
      console.log("WOULD SCROLL TO:", finalScrollPosition);
    } else {
      console.log(`NO TARGET ELEMENT FOUND for index ${currentTranscriptIndex + 1}`);
      
      // Let's see what indices are available
      const availableIndices = [...new Set(textElements.map(el => el.index))].sort((a, b) => a - b);
      console.log("Available indices:", availableIndices.slice(0, 20));
      
      // Check if there's a gap in indices
      const targetIndex = currentTranscriptIndex + 1;
      const prevIndex = availableIndices.filter(i => i < targetIndex).pop();
      const nextIndex = availableIndices.filter(i => i > targetIndex).shift();
      
      console.log(`Target index ${targetIndex}: prev=${prevIndex}, next=${nextIndex}`);
    }
  } else if (currentTranscriptIndex < 0 && maxScrollIndexRef < 0) {
    console.log("Would scroll to top (position 0)");
  } else {
    console.log("Would not scroll (currentTranscriptIndex <= maxScrollIndexRef)");
  }
}

// Test with the amazing-grace.txt content
const plainTextContent = `[1] Amazing grace (how sweet the sound)
that saved a wretch like me!
I once was lost, but now am found,
was blind, but now I see.`;

function tokenize(text) {
  const results = [];
  let current = null;
  let i = 0;
  
  while (i < text.length) {
    let s = text[i];
    let inToken;
    
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

console.log("=== Initial State ===");
console.log("Total text elements:", textElements.length);

// Test different scenarios
console.log("\n=== Test Scenario 1: Initial State ===");
simulateScrollingBehavior(textElements, -1, -1);

console.log("\n=== Test Scenario 2: After first word recognized ===");
simulateScrollingBehavior(textElements, 0, -1);

console.log("\n=== Test Scenario 3: After second word recognized ===");
simulateScrollingBehavior(textElements, 1, -1);

console.log("\n=== Test Scenario 4: After third word recognized ===");
simulateScrollingBehavior(textElements, 2, -1);

console.log("\n=== Test Scenario 5: With interim transcript ===");
simulateScrollingBehavior(textElements, 2, 3);

// Let's also check the specific issue - what happens when we have bracketed content
console.log("\n=== Analyzing Bracketed Content Issue ===");
const bracketElements = textElements.filter(el => el.value.includes('[') && el.value.includes(']'));
console.log("Bracket elements:", bracketElements);

// Check if the issue is related to how the ref is assigned
console.log("\n=== Ref Assignment Analysis ===");
console.log("In Content.tsx, the ref is assigned to:");
console.log("shouldHaveRef = currentTranscriptIndex >= 0 && textElement.index === currentTranscriptIndex + 1");

// Test this logic
function testRefAssignment(currentTranscriptIndex) {
  const targetIndex = currentTranscriptIndex + 1;
  const elementsWithRef = textElements.filter(el => el.index === targetIndex);
  
  console.log(`\nFor transcript index ${currentTranscriptIndex}:`);
  console.log(`Looking for element with index ${targetIndex}`);
  console.log(`Elements that would get the ref:`, elementsWithRef.map(el => ({
    index: el.index,
    type: el.type,
    value: el.value.replace(/\n/g, '\\n')
  })));
}

testRefAssignment(0);
testRefAssignment(1);
testRefAssignment(2);
testRefAssignment(3);