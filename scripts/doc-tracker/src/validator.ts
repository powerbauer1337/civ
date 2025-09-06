/**
 * Documentation Validator
 * Validates documentation completeness and quality
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { 
  DocumentMetadata, 
  ValidationResult, 
  ValidationError, 
  ValidationWarning, 
  CoverageMetrics,
  DocTrackerConfig 
} from './types.js';

export class DocumentValidator {
  constructor(private config: DocTrackerConfig) {}

  /**
   * Validates documentation completeness and quality
   */
  async validateDocumentation(documents: DocumentMetadata[]): Promise<ValidationResult> {
    console.log(chalk.blue('🔍 Validating documentation...'));

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate individual documents
    for (const doc of documents) {
      const docErrors = await this.validateDocument(doc);
      const docWarnings = await this.generateWarnings(doc);
      
      errors.push(...docErrors);
      warnings.push(...docWarnings);
    }

    // Calculate coverage metrics
    const coverage = await this.calculateCoverage(documents);

    // Validate index completeness
    const indexErrors = await this.validateIndex(documents);
    errors.push(...indexErrors);

    const isValid = errors.length === 0;

    if (errors.length > 0) {
      console.log(chalk.red(`❌ Found ${errors.length} validation errors`));
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`⚠️ Found ${warnings.length} warnings`));
    }

    if (isValid) {
      console.log(chalk.green('✅ Documentation validation passed'));
    }

    return {
      isValid,
      errors,
      warnings,
      coverage
    };
  }

  /**
   * Validates a single document
   */
  private async validateDocument(doc: DocumentMetadata): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check if file exists
    if (!await fs.pathExists(doc.filePath)) {
      errors.push({
        type: 'missing-title',
        filePath: doc.filePath,
        message: 'Referenced file does not exist',
        suggestion: 'Remove from index or restore file'
      });
      return errors;
    }

    // Validate title
    if (this.config.validation.requireTitles && !doc.title.trim()) {
      errors.push({
        type: 'missing-title',
        filePath: doc.filePath,
        message: 'Document is missing a title',
        suggestion: 'Add a title in frontmatter or as first heading'
      });
    }

    if (doc.title.length > this.config.validation.maxTitleLength) {
      errors.push({
        type: 'missing-title',
        filePath: doc.filePath,
        message: `Title exceeds maximum length (${this.config.validation.maxTitleLength})`,
        suggestion: 'Shorten the title'
      });
    }

    // Validate description
    if (this.config.validation.requireDescriptions && !doc.description) {
      errors.push({
        type: 'missing-description',
        filePath: doc.filePath,
        message: 'Document is missing a description',
        suggestion: 'Add a description in frontmatter or document content'
      });
    }

    // Validate category
    if (!this.config.categories.has(doc.category)) {
      errors.push({
        type: 'invalid-category',
        filePath: doc.filePath,
        message: `Invalid category: ${doc.category}`,
        suggestion: `Use one of: ${Array.from(this.config.categories.keys()).join(', ')}`
      });
    }

    // Check for broken internal links
    const content = await fs.readFile(doc.filePath, 'utf-8');
    const linkErrors = await this.validateLinks(doc.filePath, content);
    errors.push(...linkErrors);

    // Check for duplicate titles
    // (This would be handled at the collection level)

    return errors;
  }

  /**
   * Validates internal links in a document
   */
  private async validateLinks(filePath: string, content: string): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const docDir = path.dirname(filePath);
    const docsRoot = this.config.docsDir;

    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      const [, linkText, linkPath] = match;
      
      // Skip external links
      if (linkPath.startsWith('http://') || linkPath.startsWith('https://') || linkPath.startsWith('mailto:')) {
        continue;
      }

      // Skip anchor links
      if (linkPath.startsWith('#')) {
        continue;
      }

      // Resolve relative links
      let resolvedPath: string;
      if (linkPath.startsWith('./')) {
        resolvedPath = path.resolve(docDir, linkPath);
      } else if (linkPath.startsWith('../')) {
        resolvedPath = path.resolve(docDir, linkPath);
      } else if (linkPath.startsWith('/')) {
        resolvedPath = path.join(process.cwd(), linkPath.substring(1));
      } else {
        resolvedPath = path.resolve(docsRoot, linkPath);
      }

      // Check if target exists
      if (!await fs.pathExists(resolvedPath)) {
        errors.push({
          type: 'broken-link',
          filePath,
          message: `Broken link to: ${linkPath}`,
          suggestion: `Fix the link or create the target file at ${resolvedPath}`
        });
      }
    }

    return errors;
  }

  /**
   * Generates warnings for document quality issues
   */
  private async generateWarnings(doc: DocumentMetadata): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Check word count
    if (doc.wordCount < this.config.validation.minWordCount) {
      warnings.push({
        type: 'low-word-count',
        filePath: doc.filePath,
        message: `Document has low word count (${doc.wordCount})`,
        suggestion: 'Consider expanding the content or combining with other documents'
      });
    }

    // Check file age
    const ageInDays = (Date.now() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (ageInDays > this.config.validation.maxFileAgeDays) {
      warnings.push({
        type: 'old-document',
        filePath: doc.filePath,
        message: `Document is ${Math.round(ageInDays)} days old`,
        suggestion: 'Review and update the content if necessary'
      });
    }

    // Check large files
    if (doc.size > 1024 * 1024) { // 1MB
      warnings.push({
        type: 'large-file',
        filePath: doc.filePath,
        message: `Large file size (${Math.round(doc.size / 1024 / 1024)}MB)`,
        suggestion: 'Consider splitting into smaller documents'
      });
    }

    // Check missing description
    if (!doc.description) {
      warnings.push({
        type: 'no-description',
        filePath: doc.filePath,
        message: 'Document is missing a description',
        suggestion: 'Add a description to improve discoverability'
      });
    }

    return warnings;
  }

  /**
   * Calculates coverage metrics
   */
  private async calculateCoverage(trackedDocuments: DocumentMetadata[]): Promise<CoverageMetrics> {
    // Find all markdown files in docs directory
    const { glob } = await import('glob');
    const allFiles = await glob('**/*.{md,markdown}', {
      cwd: this.config.docsDir,
      absolute: true,
      ignore: this.config.excludePatterns
    });

    const trackedPaths = new Set(trackedDocuments.map(doc => doc.filePath));
    const allPaths = new Set(allFiles);

    const missingFiles = Array.from(allPaths).filter(file => !trackedPaths.has(file));
    const orphanedEntries = Array.from(trackedPaths).filter(file => !allPaths.has(file));

    // Category breakdown
    const categoryBreakdown = new Map();
    for (const doc of trackedDocuments) {
      const count = categoryBreakdown.get(doc.category) || 0;
      categoryBreakdown.set(doc.category, count + 1);
    }

    return {
      totalFiles: allFiles.length,
      trackedFiles: trackedDocuments.length,
      coveragePercent: Math.round((trackedDocuments.length / allFiles.length) * 100),
      categoryBreakdown,
      missingFiles: missingFiles.map(file => path.relative(this.config.docsDir, file)),
      orphanedEntries: orphanedEntries.map(file => path.relative(this.config.docsDir, file))
    };
  }

  /**
   * Validates that PROJECT_INDEX.md includes all documents
   */
  private async validateIndex(documents: DocumentMetadata[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    if (!await fs.pathExists(this.config.indexPath)) {
      errors.push({
        type: 'missing-title',
        filePath: this.config.indexPath,
        message: 'PROJECT_INDEX.md does not exist',
        suggestion: 'Run the updater to create the index'
      });
      return errors;
    }

    const indexContent = await fs.readFile(this.config.indexPath, 'utf-8');
    
    // Check if each document is referenced in the index
    for (const doc of documents) {
      const relativePath = `./${doc.relativePath}`;
      if (!indexContent.includes(relativePath) && !indexContent.includes(doc.title)) {
        errors.push({
          type: 'missing-title',
          filePath: doc.filePath,
          message: `Document not referenced in PROJECT_INDEX.md`,
          suggestion: 'Run the updater to include this document in the index'
        });
      }
    }

    // Check for duplicate titles
    const titles = documents.map(doc => doc.title);
    const duplicates = titles.filter((title, index) => titles.indexOf(title) !== index);
    
    for (const title of new Set(duplicates)) {
      const duplicateDocs = documents.filter(doc => doc.title === title);
      for (const doc of duplicateDocs) {
        errors.push({
          type: 'duplicate-title',
          filePath: doc.filePath,
          message: `Duplicate title: "${title}"`,
          suggestion: 'Use unique titles for each document'
        });
      }
    }

    return errors;
  }

  /**
   * Validates a single file quickly (for git hooks)
   */
  async validateFile(filePath: string): Promise<ValidationError[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      
      // Quick validation
      const errors: ValidationError[] = [];
      
      // Check for title
      if (this.config.validation.requireTitles) {
        const hasTitle = /^#\s+.+$/m.test(content) || /^title:\s*.+$/m.test(content);
        if (!hasTitle) {
          errors.push({
            type: 'missing-title',
            filePath,
            message: 'Document is missing a title',
            suggestion: 'Add a title as first heading or in frontmatter'
          });
        }
      }

      return errors;
    } catch (error) {
      return [{
        type: 'missing-title',
        filePath,
        message: `Could not validate file: ${error}`,
        suggestion: 'Check file exists and is readable'
      }];
    }
  }
}

export default DocumentValidator;