// Script to check aria-expanded attribute values in the DOM
console.log("Checking aria-expanded attribute values...");

// Find all elements with aria-expanded attribute
const elementsWithAriaExpanded = document.querySelectorAll('[aria-expanded]');

console.log(`Found ${elementsWithAriaExpanded.length} elements with aria-expanded attribute`);

elementsWithAriaExpanded.forEach((element, index) => {
  const value = element.getAttribute('aria-expanded');
  console.log(`Element ${index + 1}:`, {
    tagName: element.tagName,
    className: element.className,
    ariaExpanded: value,
    valueType: typeof value,
    isBoolean: value === 'true' || value === 'false'
  });
});

// Check for buttons without type attribute
const buttons = document.querySelectorAll('button');
console.log(`\nFound ${buttons.length} button elements`);

let buttonsWithoutType = 0;
buttons.forEach((button, index) => {
  const hasType = button.hasAttribute('type');
  const type = button.getAttribute('type');
  
  if (!hasType) {
    buttonsWithoutType++;
    console.log(`Button ${index + 1} missing type attribute:`, {
      className: button.className,
      ariaLabel: button.getAttribute('aria-label')
    });
  }
});

console.log(`\nTotal buttons without type attribute: ${buttonsWithoutType}`);