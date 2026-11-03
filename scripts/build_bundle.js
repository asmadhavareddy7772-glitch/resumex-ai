// scripts/build_bundle.js - Compiles the full React application JSX into static/js/bundle.js
const fs = require('fs');
const path = require('path');
const babel = require('../static/js/babel.min.js');

const sourceFile = path.join(__dirname, 'app_source.jsx');
const outputFile = path.join(__dirname, '..', 'static', 'js', 'bundle.js');

if (!fs.existsSync(sourceFile)) {
  console.error('Source file not found:', sourceFile);
  process.exit(1);
}

const jsxContent = fs.readFileSync(sourceFile, 'utf8');

console.log('Compiling JSX with Babel...');
const result = babel.transform(jsxContent, {
  presets: ['react'],
  compact: false
});

fs.writeFileSync(outputFile, result.code, 'utf8');
console.log('Successfully compiled to:', outputFile, `(${result.code.length} bytes)`);
