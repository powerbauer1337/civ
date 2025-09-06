/**
 * Documentation Tracker Configuration
 * Customize the behavior of the documentation tracking system
 */

const path = require('path');

module.exports = {
  // Base documentation directory
  docsDir: path.join(__dirname, '../../docs'),
  
  // Path to the main index file
  indexPath: path.join(__dirname, '../../docs/PROJECT_INDEX.md'),
  
  // File patterns to include/exclude
  includePatterns: [
    '**/*.md',
    '**/*.markdown',
  ],
  
  excludePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.tmp.*',
    '**/*.temp.*',
    '**/*:Zone.Identifier',  // Windows zone identifier files
  ],
  
  // Validation rules
  validation: {
    requireTitles: true,
    requireDescriptions: false,
    maxTitleLength: 120,
    minWordCount: 30,
    maxFileAgeDays: 365  // Warn about docs older than 1 year
  },
  
  // Index generation settings
  indexGeneration: {
    includeWordCounts: false,
    includeLastModified: true,
    autoSort: true
  },
  
  // Git hooks configuration
  gitHooks: {
    preCommit: true,
    postCommit: true,
    failOnErrors: false  // Don't fail commits, just warn
  }
};