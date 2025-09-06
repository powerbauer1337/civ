/**
 * Documentation Index Updater
 * Updates PROJECT_INDEX.md with current documentation structure
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { DocumentMetadata, UpdateOptions, DocTrackerConfig, ProjectIndex, IndexSection } from './types.js';

export class IndexUpdater {
  constructor(private config: DocTrackerConfig) {}

  /**
   * Updates the PROJECT_INDEX.md with current documentation
   */
  async updateIndex(documents: DocumentMetadata[], options: UpdateOptions = {}): Promise<void> {
    const { dryRun = false, backup = true, force = false } = options;

    console.log(chalk.blue('📝 Updating PROJECT_INDEX.md...'));

    try {
      // Create backup if requested
      if (backup && !dryRun && await fs.pathExists(this.config.indexPath)) {
        const backupPath = `${this.config.indexPath}.backup.${Date.now()}`;
        await fs.copy(this.config.indexPath, backupPath);
        console.log(chalk.gray(`Backup created: ${backupPath}`));
      }

      // Read existing index to preserve custom sections
      let existingContent = '';
      if (await fs.pathExists(this.config.indexPath)) {
        existingContent = await fs.readFile(this.config.indexPath, 'utf-8');
      }

      // Build project index structure
      const projectIndex = this.buildProjectIndex(documents);

      // Generate new index content
      const newContent = await this.generateIndexContent(projectIndex, existingContent);

      if (dryRun) {
        console.log(chalk.yellow('🔍 Dry run mode - changes that would be made:'));
        console.log(chalk.gray('New content preview:'));
        console.log(newContent.substring(0, 500) + '...');
        return;
      }

      // Write updated index
      await fs.ensureDir(path.dirname(this.config.indexPath));
      await fs.writeFile(this.config.indexPath, newContent, 'utf-8');

      console.log(chalk.green(`✅ Successfully updated ${this.config.indexPath}`));
      console.log(chalk.gray(`Total documents tracked: ${documents.length}`));

    } catch (error) {
      console.error(chalk.red('❌ Error updating index:'), error);
      throw error;
    }
  }

  /**
   * Builds the project index structure from documents
   */
  private buildProjectIndex(documents: DocumentMetadata[]): ProjectIndex {
    const sections = new Map();
    const uncategorized: DocumentMetadata[] = [];

    // Group documents by category
    const categoryGroups = new Map();
    for (const doc of documents) {
      if (!categoryGroups.has(doc.category)) {
        categoryGroups.set(doc.category, []);
      }
      categoryGroups.get(doc.category).push(doc);
    }

    // Build sections for each category
    for (const [category, categoryDocs] of categoryGroups.entries()) {
      const categoryConfig = this.config.categories.get(category);
      
      if (!categoryConfig) {
        uncategorized.push(...categoryDocs);
        continue;
      }

      // Group by subcategory if present
      const subsections = new Map();
      const mainDocs: DocumentMetadata[] = [];

      for (const doc of categoryDocs) {
        if (doc.subcategory) {
          if (!subsections.has(doc.subcategory)) {
            subsections.set(doc.subcategory, {
              title: doc.subcategory,
              documents: [],
              category: categoryConfig
            });
          }
          subsections.get(doc.subcategory).documents.push(doc);
        } else {
          mainDocs.push(doc);
        }
      }

      const section: IndexSection = {
        title: categoryConfig.name,
        description: categoryConfig.description,
        documents: mainDocs,
        subsections: subsections.size > 0 ? subsections : undefined,
        category: categoryConfig
      };

      sections.set(category, section);
    }

    return {
      lastUpdated: new Date(),
      totalDocuments: documents.length,
      sections,
      uncategorized,
      metadata: {
        generator: 'CIV Documentation Tracker',
        version: '1.0.0',
        configPath: 'scripts/doc-tracker/src/config.ts'
      }
    };
  }

  /**
   * Generates the complete index content
   */
  private async generateIndexContent(index: ProjectIndex, existingContent: string): Promise<string> {
    // Preserve header section if it exists
    const headerMatch = existingContent.match(/^([\s\S]*?)(?=\n## 📁 Project Structure|\n---|\n## 🏗️)/);
    const header = headerMatch?.[1] || await this.generateDefaultHeader(index);

    // Generate documentation sections
    const sections: string[] = [];
    
    // Sort sections by category order
    const sortedSections = Array.from(index.sections.entries())
      .sort(([, a], [, b]) => a.category.order - b.category.order);

    for (const [category, section] of sortedSections) {
      const sectionContent = this.generateSectionContent(section);
      if (sectionContent.trim()) {
        sections.push(sectionContent);
      }
    }

    // Add uncategorized if any
    if (index.uncategorized.length > 0) {
      sections.push(this.generateUncategorizedSection(index.uncategorized));
    }

    // Generate footer
    const footer = this.generateFooter(index);

    return [
      header.trim(),
      '',
      '---',
      '',
      ...sections,
      '',
      footer
    ].join('\n');
  }

  /**
   * Generates content for a documentation section
   */
  private generateSectionContent(section: IndexSection): string {
    const lines: string[] = [];
    
    lines.push(`## ${section.category.icon} ${section.title}`);
    
    if (section.description) {
      lines.push('');
      lines.push(`*${section.description}*`);
    }
    
    lines.push('');

    // Add main documents
    for (const doc of section.documents) {
      lines.push(this.formatDocumentEntry(doc, section.category.template));
    }

    // Add subsections
    if (section.subsections) {
      for (const [, subsection] of section.subsections) {
        lines.push('');
        lines.push(`### ${subsection.title}`);
        
        for (const doc of subsection.documents) {
          lines.push(this.formatDocumentEntry(doc, section.category.template));
        }
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Formats a single document entry
   */
  private formatDocumentEntry(doc: DocumentMetadata, template?: string): string {
    const relativePath = `./${doc.relativePath}`;
    
    if (template) {
      return template
        .replace(/\{\{title\}\}/g, doc.title)
        .replace(/\{\{path\}\}/g, relativePath)
        .replace(/\{\{description\}\}/g, doc.description || '')
        .replace(/\{\{content\}\}/g, this.generateDocumentDetails(doc));
    }

    // Default format
    const status = doc.status !== 'complete' ? ` *(${doc.status})*` : '';
    const description = doc.description ? ` - ${doc.description}` : '';
    
    return `- [**${doc.title}**](${relativePath})${description}${status}`;
  }

  /**
   * Generates detailed document information
   */
  private generateDocumentDetails(doc: DocumentMetadata): string {
    const details: string[] = [];
    
    if (doc.description) {
      details.push(doc.description);
    }

    if (this.config.indexGeneration.includeWordCounts && doc.wordCount > 0) {
      details.push(`*${doc.wordCount.toLocaleString()} words*`);
    }

    if (this.config.indexGeneration.includeLastModified) {
      const lastModified = doc.lastModified.toLocaleDateString();
      details.push(`*Updated: ${lastModified}*`);
    }

    if (doc.tags.length > 0) {
      const tagString = doc.tags.map(tag => `\`${tag}\``).join(' ');
      details.push(`Tags: ${tagString}`);
    }

    return details.length > 0 ? `- ${details.join('\n- ')}` : '';
  }

  /**
   * Generates the uncategorized section
   */
  private generateUncategorizedSection(documents: DocumentMetadata[]): string {
    if (documents.length === 0) return '';

    const lines: string[] = [];
    lines.push('## ❓ Uncategorized Documentation');
    lines.push('');
    lines.push('*Documents that need categorization*');
    lines.push('');

    for (const doc of documents) {
      lines.push(this.formatDocumentEntry(doc));
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generates the default header if none exists
   */
  private async generateDefaultHeader(index: ProjectIndex): Promise<string> {
    const packageJson = path.join(process.cwd(), 'package.json');
    let projectName = 'Project Documentation';
    let description = 'Comprehensive project documentation and guides.';

    if (await fs.pathExists(packageJson)) {
      try {
        const pkg = await fs.readJson(packageJson);
        projectName = pkg.name || projectName;
        description = pkg.description || description;
      } catch {
        // Use defaults
      }
    }

    return `# ${projectName} - Documentation Index

## 🎯 Overview

${description}

**Documentation Stats:**
- 📊 **Total Documents**: ${index.totalDocuments}
- 📝 **Categories**: ${index.sections.size}
- 🔄 **Last Updated**: ${index.lastUpdated.toLocaleDateString()}
- 🤖 **Generator**: ${index.metadata.generator}

`;
  }

  /**
   * Generates the footer with metadata
   */
  private generateFooter(index: ProjectIndex): string {
    return `---

## 📊 Documentation Metrics

- **Total Documents**: ${index.totalDocuments}
- **Categories**: ${index.sections.size}
- **Last Updated**: ${index.lastUpdated.toLocaleString()}
- **Generated by**: ${index.metadata.generator} v${index.metadata.version}

---

*This index is automatically maintained by the Documentation Tracker system.*
*To update this index, run: \`npm run docs:update\`*

**Quick Navigation:**
${Array.from(index.sections.values())
  .filter(section => section.documents.length > 0)
  .map(section => `[${section.category.icon} ${section.title.replace(/^[^\s]+\s/, '')}](#${section.title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-')})`)
  .join(' | ')}`;
  }
}

export default IndexUpdater;