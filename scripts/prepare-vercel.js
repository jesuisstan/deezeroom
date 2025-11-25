const fs = require('fs');
const path = require('path');

// Use process.cwd() since script runs from project root
const projectRoot = process.cwd();

// Create api directory in dist
const apiDir = path.join(projectRoot, 'dist/api');
if (!fs.existsSync(apiDir)) {
  fs.mkdirSync(apiDir, { recursive: true });
}

// Copy graphql function to api directory
const sourceFile = path.join(
  projectRoot,
  'dist/server/_expo/functions/api/graphql+api.js'
);
const destFile = path.join(apiDir, 'graphql.js');

if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, destFile);
  console.log('✅ Copied GraphQL API function to dist/api/graphql.js');
} else {
  console.error('❌ Source file not found:', sourceFile);
  process.exit(1);
}
