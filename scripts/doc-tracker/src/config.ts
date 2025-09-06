/**
 * Documentation Tracker Configuration
 * Centralized configuration for the automated documentation tracking system
 */

import path from 'path';
import { DocTrackerConfig, CategoryConfig, DocumentCategory } from './types.js';

export const DEFAULT_CATEGORIES: Map<DocumentCategory, CategoryConfig> = new Map([
  ['technical', {
    name: '🏗️ Technical Documentation',
    description: 'Architecture, system design, and technical implementation details',
    order: 1,
    icon: '🏗️',
    expanded: true,
    template: '### [{{title}}]({{path}})\n**{{description}}**\n{{content}}\n'
  }],
  ['api', {
    name: '📚 API Documentation', 
    description: 'API references, endpoints, and integration guides',
    order: 2,
    icon: '📚',
    expanded: true,
    template: '### [{{title}}]({{path}})\n**{{description}}**\n{{content}}\n'
  }],
  ['user', {
    name: '👥 User Documentation',
    description: 'User guides, tutorials, and end-user instructions',
    order: 3,
    icon: '👥',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['setup', {
    name: '⚙️ Setup & Development',
    description: 'Installation, development setup, and configuration guides',
    order: 4,
    icon: '⚙️',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['deployment', {
    name: '🚀 Deployment Documentation',
    description: 'Production deployment, infrastructure, and operations',
    order: 5,
    icon: '🚀',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['analysis', {
    name: '📊 Analysis & Planning',
    description: 'Project analysis, audit reports, and planning documents',
    order: 6,
    icon: '📊',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['archive', {
    name: '📦 Archive',
    description: 'Deprecated and historical documentation',
    order: 7,
    icon: '📦',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['visual-concepts', {
    name: '🎨 Visual Concepts',
    description: 'Design mockups, diagrams, and visual documentation',
    order: 8,
    icon: '🎨',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['root', {
    name: '📋 Project Documentation',
    description: 'Top-level project documentation and overviews',
    order: 0,
    icon: '📋',
    expanded: true,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }],
  ['uncategorized', {
    name: '❓ Uncategorized',
    description: 'Documents that need categorization',
    order: 9,
    icon: '❓',
    expanded: false,
    template: '- [**{{title}}**]({{path}}) - {{description}}\n'
  }]
]);

export const createDefaultConfig = (projectRoot: string): DocTrackerConfig => ({
  docsDir: path.join(projectRoot, 'docs'),
  indexPath: path.join(projectRoot, 'docs', 'PROJECT_INDEX.md'),
  categories: DEFAULT_CATEGORIES,
  includePatterns: [
    '**/*.md',
    '**/*.markdown',
    '!node_modules/**',
    '!.git/**'
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/build/**',
    '**/*.tmp.*',
    '**/*.temp.*'
  ],
  validation: {
    requireTitles: true,
    requireDescriptions: false,
    maxTitleLength: 100,
    minWordCount: 50,
    maxFileAgeDays: 180
  },
  indexGeneration: {
    includeWordCounts: false,
    includeLastModified: true,
    autoSort: true
  },
  gitHooks: {
    preCommit: true,
    postCommit: false,
    failOnErrors: true
  }
});

export const loadConfig = (configPath?: string): DocTrackerConfig => {
  const projectRoot = process.cwd();
  
  if (configPath) {
    try {
      const customConfig = require(path.resolve(configPath));
      return { ...createDefaultConfig(projectRoot), ...customConfig };
    } catch (error) {
      console.warn(`Warning: Could not load config from ${configPath}, using defaults`);
    }
  }

  // Try to load from standard locations
  const standardPaths = [
    'doc-tracker.config.js',
    'doc-tracker.config.json',
    '.doc-tracker.js',
    '.doc-tracker.json'
  ];

  for (const configFile of standardPaths) {
    try {
      const fullPath = path.join(projectRoot, configFile);
      const customConfig = require(fullPath);
      console.log(`Loaded config from ${configFile}`);
      return { ...createDefaultConfig(projectRoot), ...customConfig };
    } catch {
      // Continue to next config file
    }
  }

  // Return default config
  return createDefaultConfig(projectRoot);
};

export const CATEGORY_PATTERNS: Map<DocumentCategory, RegExp[]> = new Map([
  ['technical', [
    /technical/i,
    /architecture/i,
    /system/i,
    /engine/i,
    /infrastructure/i,
    /_ARCHITECTURE\.md$/i,
    /_TECHNICAL_/i
  ]],
  ['api', [
    /api/i,
    /endpoint/i,
    /swagger/i,
    /openapi/i,
    /rest/i,
    /graphql/i,
    /websocket/i,
    /_API\.md$/i,
    /\.yaml$/i
  ]],
  ['user', [
    /user/i,
    /guide/i,
    /tutorial/i,
    /manual/i,
    /USER_GUIDE/i,
    /MANUAL/i
  ]],
  ['setup', [
    /setup/i,
    /install/i,
    /developer/i,
    /development/i,
    /DEVELOPER_GUIDE/i,
    /SETUP/i,
    /INSTALL/i
  ]],
  ['deployment', [
    /deploy/i,
    /production/i,
    /docker/i,
    /k8s/i,
    /kubernetes/i,
    /DEPLOYMENT/i,
    /PRODUCTION/i
  ]],
  ['analysis', [
    /analysis/i,
    /audit/i,
    /report/i,
    /findings/i,
    /metrics/i,
    /performance/i,
    /UX_/i,
    /_ANALYSIS/i,
    /_AUDIT/i,
    /_REPORT/i
  ]],
  ['archive', [
    /archive/i,
    /deprecated/i,
    /legacy/i,
    /old/i,
    /\.legacy\./i,
    /_LEGACY/i,
    /ARCHIVED/i
  ]],
  ['visual-concepts', [
    /visual/i,
    /mockup/i,
    /design/i,
    /concept/i,
    /diagram/i,
    /\.svg$/i,
    /\.png$/i,
    /\.jpg$/i
  ]],
  ['root', [
    /^[^\/]*\.md$/,  // Files directly in docs root
    /README/i,
    /INDEX/i,
    /OVERVIEW/i,
    /PROJECT/i
  ]]
]);

/**
 * Determines document category based on file path and content
 */
export const categorizeDocument = (filePath: string, title: string, content: string): DocumentCategory => {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check directory-based categorization first
  const pathParts = relativePath.split(path.sep);
  if (pathParts.length > 1) {
    const directory = pathParts[pathParts.length - 2]?.toLowerCase();
    
    if (directory && DEFAULT_CATEGORIES.has(directory as DocumentCategory)) {
      return directory as DocumentCategory;
    }
  }

  // Check pattern-based categorization
  for (const [category, patterns] of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(relativePath) || pattern.test(title) || pattern.test(content.substring(0, 500))) {
        return category;
      }
    }
  }

  return 'uncategorized';
};

export default { createDefaultConfig, loadConfig, categorizeDocument, DEFAULT_CATEGORIES };