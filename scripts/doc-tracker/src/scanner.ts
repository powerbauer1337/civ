/**
 * Documentation Scanner
 * Scans the docs directory for markdown files and extracts metadata
 */

import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { glob } from 'glob';
import chalk from 'chalk';
import { DocumentMetadata, ScanOptions, DocTrackerConfig } from './types.js';
import { categorizeDocument } from './config.js';

export class DocumentScanner {
  constructor(private config: DocTrackerConfig) {}

  /**
   * Scans all documentation files and extracts metadata
   */
  async scanDocuments(options: ScanOptions = {}): Promise<DocumentMetadata[]> {
    const { verbose = false, includeArchived = true, force = false } = options;
    
    if (verbose) {
      console.log(chalk.blue('🔍 Scanning documentation files...'));
      console.log(chalk.gray(`Base directory: ${this.config.docsDir}`));
    }

    // Get all markdown files
    const patterns = this.config.includePatterns.map(pattern => 
      path.join(this.config.docsDir, pattern)
    );
    
    const files = await glob(patterns, {
      ignore: this.config.excludePatterns.map(pattern => 
        path.join(this.config.docsDir, pattern)
      ),
      absolute: true,
      nodir: true
    });

    if (verbose) {
      console.log(chalk.gray(`Found ${files.length} files`));
    }

    const documents: DocumentMetadata[] = [];
    let processed = 0;

    for (const filePath of files) {
      try {
        // Skip archived documents if not included
        if (!includeArchived && filePath.includes('/archive/')) {
          continue;
        }

        const metadata = await this.extractMetadata(filePath, verbose);
        if (metadata) {
          documents.push(metadata);
          processed++;
          
          if (verbose && processed % 10 === 0) {
            console.log(chalk.gray(`Processed ${processed}/${files.length} files`));
          }
        }
      } catch (error) {
        console.error(chalk.red(`Error processing ${filePath}:`), error);
      }
    }

    if (verbose) {
      console.log(chalk.green(`✅ Successfully processed ${processed} documents`));
      this.printCategorySummary(documents);
    }

    return this.sortDocuments(documents);
  }

  /**
   * Extracts metadata from a single document
   */
  async extractMetadata(filePath: string, verbose = false): Promise<DocumentMetadata | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stats = await fs.stat(filePath);
      const parsed = matter(content);
      
      const relativePath = path.relative(this.config.docsDir, filePath);
      
      // Extract title from frontmatter or first heading
      let title = parsed.data.title as string | undefined;
      if (!title) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        title = titleMatch?.[1]?.trim() || path.basename(filePath, path.extname(filePath));
      }

      // Extract description from frontmatter or content
      let description = parsed.data.description as string | undefined;
      if (!description) {
        // Try to find description in content
        const descMatch = content.match(/(?:^|\n)(?:>|\*\*)?(.{20,200}?)(?:\n|$)/m);
        description = descMatch?.[1]?.trim().replace(/[#*>]/g, '').trim();
        
        // Limit description length
        if (description && description.length > 200) {
          description = description.substring(0, 197) + '...';
        }
      }

      // Determine category
      const category = parsed.data.category as string || 
        categorizeDocument(filePath, title, content);

      // Extract tags
      const tags = Array.isArray(parsed.data.tags) 
        ? parsed.data.tags as string[]
        : typeof parsed.data.tags === 'string'
        ? [parsed.data.tags]
        : [];

      // Calculate word count (approximate)
      const wordCount = content
        .replace(/[#*>`\-=\[\]()]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0).length;

      // Determine priority
      const priority = parsed.data.priority as 'high' | 'medium' | 'low' || 
        this.determinePriority(filePath, title, wordCount);

      // Determine status
      const status = parsed.data.status as 'complete' | 'draft' | 'outdated' | 'deprecated' ||
        this.determineStatus(filePath, stats.mtime, content);

      const metadata: DocumentMetadata = {
        filePath,
        relativePath,
        title,
        description,
        category: category as any,
        subcategory: parsed.data.subcategory as string,
        tags,
        lastModified: stats.mtime,
        size: stats.size,
        wordCount,
        hasFrontmatter: Object.keys(parsed.data).length > 0,
        priority,
        status
      };

      if (verbose && Object.keys(parsed.data).length > 0) {
        console.log(chalk.cyan(`  📄 ${title} (${category})`));
      }

      return metadata;

    } catch (error) {
      console.error(chalk.red(`Error extracting metadata from ${filePath}:`), error);
      return null;
    }
  }

  /**
   * Determines document priority based on various factors
   */
  private determinePriority(filePath: string, title: string, wordCount: number): 'high' | 'medium' | 'low' {
    const highPriorityPatterns = [
      /readme/i, /index/i, /overview/i, /architecture/i, /api/i, /getting.?started/i
    ];
    
    const lowPriorityPatterns = [
      /archive/i, /deprecated/i, /legacy/i, /todo/i, /draft/i
    ];

    const fileName = path.basename(filePath);
    const fullPath = filePath.toLowerCase();

    if (highPriorityPatterns.some(pattern => pattern.test(title) || pattern.test(fileName))) {
      return 'high';
    }

    if (lowPriorityPatterns.some(pattern => pattern.test(fullPath) || pattern.test(title))) {
      return 'low';
    }

    // Word count based priority
    if (wordCount > 1000) return 'high';
    if (wordCount < 100) return 'low';

    return 'medium';
  }

  /**
   * Determines document status based on age and content
   */
  private determineStatus(filePath: string, lastModified: Date, content: string): 'complete' | 'draft' | 'outdated' | 'deprecated' {
    const now = new Date();
    const ageInDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    
    // Check for explicit status indicators
    if (/deprecated|obsolete|no.?longer.?used/i.test(content)) {
      return 'deprecated';
    }
    
    if (/draft|todo|wip|work.?in.?progress|incomplete/i.test(content)) {
      return 'draft';
    }
    
    if (/archive/i.test(filePath)) {
      return 'deprecated';
    }

    // Age-based status
    if (ageInDays > this.config.validation.maxFileAgeDays) {
      return 'outdated';
    }

    return 'complete';
  }

  /**
   * Sorts documents by category priority and then by document priority
   */
  private sortDocuments(documents: DocumentMetadata[]): DocumentMetadata[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    return documents.sort((a, b) => {
      // First sort by category order
      const categoryA = this.config.categories.get(a.category);
      const categoryB = this.config.categories.get(b.category);
      const categoryOrderDiff = (categoryA?.order || 999) - (categoryB?.order || 999);
      
      if (categoryOrderDiff !== 0) {
        return categoryOrderDiff;
      }

      // Then by document priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      // Finally by title
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Prints a summary of documents by category
   */
  private printCategorySummary(documents: DocumentMetadata[]): void {
    const categoryCount = new Map<string, number>();
    
    for (const doc of documents) {
      const count = categoryCount.get(doc.category) || 0;
      categoryCount.set(doc.category, count + 1);
    }

    console.log(chalk.blue('\n📊 Category Summary:'));
    for (const [category, count] of categoryCount.entries()) {
      const config = this.config.categories.get(category as any);
      const icon = config?.icon || '📄';
      console.log(chalk.gray(`  ${icon} ${category}: ${count} documents`));
    }
  }

  /**
   * Gets metadata for a specific file
   */
  async getFileMetadata(filePath: string): Promise<DocumentMetadata | null> {
    return this.extractMetadata(filePath);
  }

  /**
   * Checks if a file should be tracked
   */
  shouldTrackFile(filePath: string): boolean {
    const relativePath = path.relative(this.config.docsDir, filePath);
    
    // Check include patterns
    const isIncluded = this.config.includePatterns.some(pattern => {
      const fullPattern = path.join(this.config.docsDir, pattern);
      return filePath.match(this.globToRegex(fullPattern));
    });

    if (!isIncluded) return false;

    // Check exclude patterns
    const isExcluded = this.config.excludePatterns.some(pattern => {
      const fullPattern = path.join(this.config.docsDir, pattern);
      return filePath.match(this.globToRegex(fullPattern));
    });

    return !isExcluded;
  }

  /**
   * Converts a glob pattern to a regular expression
   */
  private globToRegex(pattern: string): RegExp {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');
    
    return new RegExp(`^${regexPattern}$`);
  }
}

export default DocumentScanner;