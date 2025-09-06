/**
 * Documentation Tracking System Types
 * Provides comprehensive type definitions for the automated documentation system
 */

export interface DocumentMetadata {
  /** Absolute file path */
  filePath: string;
  /** Relative path from docs root */
  relativePath: string;
  /** Document title extracted from frontmatter or first h1 */
  title: string;
  /** Brief description from frontmatter or content */
  description?: string;
  /** Document category for organization */
  category: DocumentCategory;
  /** Subcategory for detailed organization */
  subcategory?: string;
  /** Tags for additional categorization */
  tags: string[];
  /** Last modified timestamp */
  lastModified: Date;
  /** File size in bytes */
  size: number;
  /** Word count estimation */
  wordCount: number;
  /** Whether document has frontmatter */
  hasFrontmatter: boolean;
  /** Priority level for index ordering */
  priority: 'high' | 'medium' | 'low';
  /** Status of the document */
  status: 'complete' | 'draft' | 'outdated' | 'deprecated';
}

export type DocumentCategory = 
  | 'technical'
  | 'api'
  | 'user'
  | 'setup'
  | 'deployment' 
  | 'analysis'
  | 'archive'
  | 'visual-concepts'
  | 'root'
  | 'uncategorized';

export interface CategoryConfig {
  /** Display name for the category */
  name: string;
  /** Description of what belongs in this category */
  description: string;
  /** Priority order in the index (lower = higher priority) */
  order: number;
  /** Icon emoji for display */
  icon: string;
  /** Whether this category should be expanded by default */
  expanded: boolean;
  /** Template for generating category sections */
  template?: string;
}

export interface IndexSection {
  /** Section title */
  title: string;
  /** Section description */
  description?: string;
  /** Documents in this section */
  documents: DocumentMetadata[];
  /** Subsections for nested organization */
  subsections?: Map<string, IndexSection>;
  /** Category configuration */
  category: CategoryConfig;
}

export interface ProjectIndex {
  /** When the index was last generated */
  lastUpdated: Date;
  /** Total number of documents tracked */
  totalDocuments: number;
  /** Documents organized by category */
  sections: Map<DocumentCategory, IndexSection>;
  /** Documents that couldn't be categorized */
  uncategorized: DocumentMetadata[];
  /** Index generation metadata */
  metadata: {
    generator: string;
    version: string;
    configPath: string;
  };
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors found */
  errors: ValidationError[];
  /** Warnings that don't fail validation */
  warnings: ValidationWarning[];
  /** Coverage metrics */
  coverage: CoverageMetrics;
}

export interface ValidationError {
  /** Error type */
  type: 'missing-title' | 'invalid-category' | 'broken-link' | 'duplicate-title' | 'missing-description';
  /** File where error occurred */
  filePath: string;
  /** Error message */
  message: string;
  /** Suggested fix */
  suggestion?: string;
}

export interface ValidationWarning {
  /** Warning type */
  type: 'long-title' | 'no-description' | 'old-document' | 'large-file' | 'low-word-count';
  /** File where warning occurred */
  filePath: string;
  /** Warning message */
  message: string;
  /** Suggested improvement */
  suggestion?: string;
}

export interface CoverageMetrics {
  /** Total files in docs directory */
  totalFiles: number;
  /** Files tracked in index */
  trackedFiles: number;
  /** Coverage percentage */
  coveragePercent: number;
  /** Files by category */
  categoryBreakdown: Map<DocumentCategory, number>;
  /** Files missing from index */
  missingFiles: string[];
  /** Orphaned entries in index */
  orphanedEntries: string[];
}

export interface DocTrackerConfig {
  /** Base directory for documentation */
  docsDir: string;
  /** Path to PROJECT_INDEX.md */
  indexPath: string;
  /** Category configurations */
  categories: Map<DocumentCategory, CategoryConfig>;
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Validation rules */
  validation: {
    /** Require titles in all documents */
    requireTitles: boolean;
    /** Require descriptions */
    requireDescriptions: boolean;
    /** Maximum title length */
    maxTitleLength: number;
    /** Minimum word count */
    minWordCount: number;
    /** Maximum file age in days before warning */
    maxFileAgeDays: number;
  };
  /** Index generation settings */
  indexGeneration: {
    /** Template file for index generation */
    templatePath?: string;
    /** Whether to include word counts */
    includeWordCounts: boolean;
    /** Whether to include last modified dates */
    includeLastModified: boolean;
    /** Whether to auto-sort sections */
    autoSort: boolean;
  };
  /** Git hook integration */
  gitHooks: {
    /** Enable pre-commit hook */
    preCommit: boolean;
    /** Enable post-commit hook */
    postCommit: boolean;
    /** Fail commit on validation errors */
    failOnErrors: boolean;
  };
}

export interface ScanOptions {
  /** Force rescan of all files */
  force?: boolean;
  /** Include archived documents */
  includeArchived?: boolean;
  /** Verbose output */
  verbose?: boolean;
}

export interface UpdateOptions {
  /** Dry run without making changes */
  dryRun?: boolean;
  /** Backup existing index */
  backup?: boolean;
  /** Force update even with warnings */
  force?: boolean;
}

export interface ReportOptions {
  /** Output format */
  format: 'console' | 'json' | 'html' | 'markdown';
  /** Output file path */
  outputPath?: string;
  /** Include detailed metrics */
  detailed?: boolean;
}