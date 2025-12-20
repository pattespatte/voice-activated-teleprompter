#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Test script to verify SSR build
console.log('Testing SSR build...\n');

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if SSR build directory exists
const ssrDir = path.join(__dirname, 'dist-ssr');
if (!fs.existsSync(ssrDir)) {
  console.error('❌ SSR build directory not found. Run "npm run build:ssr" first.');
  process.exit(1);
}

// Check if index.html file exists
const htmlFile = path.join(ssrDir, 'index.html');
if (!fs.existsSync(htmlFile)) {
  console.error('❌ SSR index.html file not found.');
  process.exit(1);
}

// Read and analyze HTML file
const htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Check if JavaScript is inlined
const hasInlineJS = htmlContent.includes('<script type="module" crossorigin>');
if (!hasInlineJS) {
  console.error('❌ JavaScript is not properly inlined.');
  process.exit(1);
}

// Check if CSS is inlined
const hasInlineCSS = htmlContent.includes('<style>');
if (!hasInlineCSS) {
  console.error('❌ CSS is not properly inlined.');
  process.exit(1);
}

// Check for relative paths (important for file:// protocol)
const hasRelativePaths = htmlContent.includes('href="./') || htmlContent.includes('src="./');
if (!hasRelativePaths) {
  console.warn('⚠️  No relative paths found. This might cause issues with file:// protocol.');
}

// Check for speech recognition fallback
const hasSpeechFallback = htmlContent.includes('getIsSupported') || htmlContent.includes('webkitSpeechRecognition');
if (!hasSpeechFallback) {
  console.warn('⚠️  Speech recognition fallback might not be properly implemented.');
}

// Check file size
const stats = fs.statSync(htmlFile);
const fileSizeKB = Math.round(stats.size / 1024);

console.log('✅ SSR build validation passed!\n');
console.log('📊 Build statistics:');
console.log(`   - File size: ${fileSizeKB} KB`);
console.log(`   - JavaScript inlined: ${hasInlineJS ? 'Yes' : 'No'}`);
console.log(`   - CSS inlined: ${hasInlineCSS ? 'Yes' : 'No'}`);
console.log(`   - Relative paths: ${hasRelativePaths ? 'Yes' : 'No'}`);
console.log(`   - Speech recognition fallback: ${hasSpeechFallback ? 'Yes' : 'No'}`);

console.log('\n📝 To test manually:');
console.log('   1. Open the file in your browser: file://' + htmlFile);
console.log('   2. Verify the application loads without server errors');
console.log('   3. Test basic functionality (text input, scrolling)');
console.log('   4. Check if speech recognition shows appropriate warnings in unsupported browsers');