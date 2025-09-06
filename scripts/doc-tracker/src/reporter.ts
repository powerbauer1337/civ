/**
 * Documentation Reporter
 * Generates comprehensive reports on documentation status and coverage
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { 
  DocumentMetadata, 
  ValidationResult, 
  ReportOptions,
  CoverageMetrics,
  DocTrackerConfig
} from './types.js';

export class DocumentationReporter {
  constructor(private config: DocTrackerConfig) {}

  /**
   * Generates a comprehensive documentation report
   */
  async generateReport(
    documents: DocumentMetadata[],
    validationResult: ValidationResult,
    options: ReportOptions
  ): Promise<void> {
    const { format, outputPath, detailed = false } = options;

    console.log(chalk.blue('📊 Generating documentation report...'));

    switch (format) {
      case 'console':
        this.generateConsoleReport(documents, validationResult, detailed);
        break;
      case 'json':
        await this.generateJsonReport(documents, validationResult, outputPath);
        break;
      case 'html':
        await this.generateHtmlReport(documents, validationResult, outputPath);
        break;
      case 'markdown':
        await this.generateMarkdownReport(documents, validationResult, outputPath);
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Generates console output report
   */
  private generateConsoleReport(
    documents: DocumentMetadata[], 
    validation: ValidationResult, 
    detailed: boolean
  ): void {
    console.log(chalk.bold.blue('\n📋 DOCUMENTATION REPORT\n'));

    // Summary metrics
    this.printSummaryMetrics(documents, validation.coverage);

    // Validation results
    this.printValidationResults(validation);

    // Category breakdown
    this.printCategoryBreakdown(documents);

    // Detailed information if requested
    if (detailed) {
      this.printDetailedDocuments(documents);
      this.printValidationDetails(validation);
    }

    // Recommendations
    this.printRecommendations(documents, validation);
  }

  /**
   * Prints summary metrics
   */
  private printSummaryMetrics(documents: DocumentMetadata[], coverage: CoverageMetrics): void {
    console.log(chalk.bold('📊 Summary Metrics'));
    console.log(chalk.green(`✅ Total Documents: ${documents.length}`));
    console.log(chalk.green(`📁 Coverage: ${coverage.coveragePercent}% (${coverage.trackedFiles}/${coverage.totalFiles})`));
    console.log(chalk.green(`📂 Categories: ${coverage.categoryBreakdown.size}`));
    
    const avgWordCount = documents.length > 0 
      ? Math.round(documents.reduce((sum, doc) => sum + doc.wordCount, 0) / documents.length)
      : 0;
    console.log(chalk.green(`📝 Average Word Count: ${avgWordCount.toLocaleString()}`));

    const recentDocs = documents.filter(doc => {
      const daysSince = (Date.now() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    }).length;
    console.log(chalk.green(`🔄 Recently Updated (30 days): ${recentDocs}`));
    console.log();
  }

  /**
   * Prints validation results summary
   */
  private printValidationResults(validation: ValidationResult): void {
    console.log(chalk.bold('🔍 Validation Results'));
    
    if (validation.isValid) {
      console.log(chalk.green('✅ All validations passed'));
    } else {
      console.log(chalk.red(`❌ ${validation.errors.length} errors found`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(chalk.yellow(`⚠️ ${validation.warnings.length} warnings`));
    }

    console.log();
  }

  /**
   * Prints category breakdown
   */
  private printCategoryBreakdown(documents: DocumentMetadata[]): void {
    console.log(chalk.bold('📁 Category Breakdown'));
    
    const categoryStats = new Map();
    for (const doc of documents) {
      const category = doc.category;
      if (!categoryStats.has(category)) {
        categoryStats.set(category, {
          count: 0,
          wordCount: 0,
          avgAge: 0,
          statuses: new Map()
        });
      }
      
      const stats = categoryStats.get(category);
      stats.count++;
      stats.wordCount += doc.wordCount;
      
      const status = doc.status;
      stats.statuses.set(status, (stats.statuses.get(status) || 0) + 1);
    }

    // Sort by category order
    const sortedCategories = Array.from(categoryStats.entries())
      .sort(([a], [b]) => {
        const orderA = this.config.categories.get(a)?.order || 999;
        const orderB = this.config.categories.get(b)?.order || 999;
        return orderA - orderB;
      });

    for (const [category, stats] of sortedCategories) {
      const config = this.config.categories.get(category);
      const icon = config?.icon || '📄';
      const name = config?.name || category;
      const avgWords = Math.round(stats.wordCount / stats.count);
      
      console.log(chalk.cyan(`  ${icon} ${name}: ${stats.count} docs (${avgWords.toLocaleString()} avg words)`));
      
      // Show status breakdown if diverse
      const statusEntries = Array.from(stats.statuses.entries());
      if (statusEntries.length > 1) {
        const statusSummary = statusEntries.map(([status, count]) => `${count} ${status}`).join(', ');
        console.log(chalk.gray(`    Status: ${statusSummary}`));
      }
    }
    
    console.log();
  }

  /**
   * Prints detailed document information
   */
  private printDetailedDocuments(documents: DocumentMetadata[]): void {
    console.log(chalk.bold('📄 Document Details'));
    
    // Group by category
    const byCategory = new Map();
    for (const doc of documents) {
      if (!byCategory.has(doc.category)) {
        byCategory.set(doc.category, []);
      }
      byCategory.get(doc.category).push(doc);
    }

    for (const [category, docs] of byCategory.entries()) {
      const config = this.config.categories.get(category);
      const icon = config?.icon || '📄';
      
      console.log(chalk.cyan(`\n  ${icon} ${category.toUpperCase()}`));
      
      for (const doc of docs) {
        const statusIcon = this.getStatusIcon(doc.status);
        const ageInDays = Math.round((Date.now() - doc.lastModified.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(chalk.gray(`    ${statusIcon} ${doc.title}`));
        console.log(chalk.gray(`      Path: ${doc.relativePath}`));
        console.log(chalk.gray(`      Words: ${doc.wordCount.toLocaleString()}, Age: ${ageInDays}d, Size: ${this.formatSize(doc.size)}`));
        
        if (doc.description) {
          console.log(chalk.gray(`      Desc: ${doc.description.substring(0, 80)}${doc.description.length > 80 ? '...' : ''}`));
        }
      }
    }
    
    console.log();
  }

  /**
   * Prints validation details
   */
  private printValidationDetails(validation: ValidationResult): void {
    if (validation.errors.length > 0) {
      console.log(chalk.bold.red('❌ Validation Errors'));
      for (const error of validation.errors) {
        console.log(chalk.red(`  ${error.type}: ${error.message}`));
        console.log(chalk.gray(`    File: ${error.filePath}`));
        if (error.suggestion) {
          console.log(chalk.gray(`    Fix: ${error.suggestion}`));
        }
      }
      console.log();
    }

    if (validation.warnings.length > 0) {
      console.log(chalk.bold.yellow('⚠️ Validation Warnings'));
      for (const warning of validation.warnings.slice(0, 10)) { // Limit to first 10
        console.log(chalk.yellow(`  ${warning.type}: ${warning.message}`));
        console.log(chalk.gray(`    File: ${warning.filePath}`));
      }
      
      if (validation.warnings.length > 10) {
        console.log(chalk.gray(`    ... and ${validation.warnings.length - 10} more warnings`));
      }
      console.log();
    }
  }

  /**
   * Prints actionable recommendations
   */
  private printRecommendations(documents: DocumentMetadata[], validation: ValidationResult): void {
    console.log(chalk.bold('💡 Recommendations'));

    const recommendations: string[] = [];

    // Coverage recommendations
    if (validation.coverage.coveragePercent < 100) {
      recommendations.push(`📈 Improve coverage: ${validation.coverage.missingFiles.length} files not tracked`);
    }

    // Quality recommendations
    const draftDocs = documents.filter(doc => doc.status === 'draft').length;
    if (draftDocs > 0) {
      recommendations.push(`📝 Complete ${draftDocs} draft documents`);
    }

    const outdatedDocs = documents.filter(doc => doc.status === 'outdated').length;
    if (outdatedDocs > 0) {
      recommendations.push(`🔄 Update ${outdatedDocs} outdated documents`);
    }

    const lowWordCount = documents.filter(doc => 
      doc.wordCount < this.config.validation.minWordCount
    ).length;
    if (lowWordCount > 0) {
      recommendations.push(`📏 Expand ${lowWordCount} documents with low word count`);
    }

    // Organization recommendations
    const uncategorized = documents.filter(doc => doc.category === 'uncategorized').length;
    if (uncategorized > 0) {
      recommendations.push(`🏷️ Categorize ${uncategorized} uncategorized documents`);
    }

    if (recommendations.length === 0) {
      console.log(chalk.green('✨ Documentation is in excellent shape!'));
    } else {
      recommendations.forEach(rec => console.log(chalk.blue(`  • ${rec}`)));
    }
    
    console.log();
  }

  /**
   * Generates JSON report
   */
  private async generateJsonReport(
    documents: DocumentMetadata[],
    validation: ValidationResult,
    outputPath?: string
  ): Promise<void> {
    const report = {
      generated: new Date().toISOString(),
      summary: {
        totalDocuments: documents.length,
        coverage: validation.coverage,
        validation: {
          isValid: validation.isValid,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length
        }
      },
      documents: documents.map(doc => ({
        ...doc,
        lastModified: doc.lastModified.toISOString()
      })),
      validation,
      categories: Object.fromEntries(this.config.categories.entries())
    };

    const json = JSON.stringify(report, null, 2);
    
    if (outputPath) {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, json, 'utf-8');
      console.log(chalk.green(`✅ JSON report saved to ${outputPath}`));
    } else {
      console.log(json);
    }
  }

  /**
   * Generates HTML report
   */
  private async generateHtmlReport(
    documents: DocumentMetadata[],
    validation: ValidationResult,
    outputPath?: string
  ): Promise<void> {
    const html = this.generateHtmlContent(documents, validation);
    
    const finalPath = outputPath || path.join(this.config.docsDir, 'documentation-report.html');
    await fs.ensureDir(path.dirname(finalPath));
    await fs.writeFile(finalPath, html, 'utf-8');
    
    console.log(chalk.green(`✅ HTML report saved to ${finalPath}`));
  }

  /**
   * Generates Markdown report
   */
  private async generateMarkdownReport(
    documents: DocumentMetadata[],
    validation: ValidationResult,
    outputPath?: string
  ): Promise<void> {
    const markdown = this.generateMarkdownContent(documents, validation);
    
    const finalPath = outputPath || path.join(this.config.docsDir, 'DOCUMENTATION_REPORT.md');
    await fs.ensureDir(path.dirname(finalPath));
    await fs.writeFile(finalPath, markdown, 'utf-8');
    
    console.log(chalk.green(`✅ Markdown report saved to ${finalPath}`));
  }

  /**
   * Generates HTML content for report
   */
  private generateHtmlContent(documents: DocumentMetadata[], validation: ValidationResult): string {
    const categoryStats = this.getCategoryStats(documents);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border: 1px solid #e1e5e9; border-radius: 6px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #24292e; }
        .metric .value { font-size: 2em; font-weight: bold; color: #28a745; }
        .category { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 6px; }
        .document { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #0366d6; }
        .status-complete { border-left-color: #28a745; }
        .status-draft { border-left-color: #ffc107; }
        .status-outdated { border-left-color: #fd7e14; }
        .status-deprecated { border-left-color: #dc3545; }
        .error { color: #dc3545; background: #f8d7da; padding: 10px; border-radius: 4px; margin: 5px 0; }
        .warning { color: #856404; background: #fff3cd; padding: 10px; border-radius: 4px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Documentation Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        <p>Total Documents: ${documents.length} | Coverage: ${validation.coverage.coveragePercent}%</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>📊 Total Documents</h3>
            <div class="value">${documents.length}</div>
        </div>
        <div class="metric">
            <h3>📈 Coverage</h3>
            <div class="value">${validation.coverage.coveragePercent}%</div>
        </div>
        <div class="metric">
            <h3>📂 Categories</h3>
            <div class="value">${validation.coverage.categoryBreakdown.size}</div>
        </div>
        <div class="metric">
            <h3>❌ Errors</h3>
            <div class="value">${validation.errors.length}</div>
        </div>
    </div>

    ${this.generateHtmlCategoryBreakdown(categoryStats)}
    ${this.generateHtmlValidationSection(validation)}
    ${this.generateHtmlDocumentsList(documents)}
</body>
</html>`;
  }

  /**
   * Generates Markdown content for report
   */
  private generateMarkdownContent(documents: DocumentMetadata[], validation: ValidationResult): string {
    const categoryStats = this.getCategoryStats(documents);

    return `# 📚 Documentation Report

*Generated on ${new Date().toLocaleString()}*

## 📊 Summary

- **Total Documents**: ${documents.length}
- **Coverage**: ${validation.coverage.coveragePercent}% (${validation.coverage.trackedFiles}/${validation.coverage.totalFiles})
- **Categories**: ${validation.coverage.categoryBreakdown.size}
- **Validation**: ${validation.isValid ? '✅ Passed' : '❌ Failed'} (${validation.errors.length} errors, ${validation.warnings.length} warnings)

## 📁 Category Breakdown

${Array.from(categoryStats.entries())
  .map(([category, stats]) => {
    const config = this.config.categories.get(category);
    const icon = config?.icon || '📄';
    return `- **${icon} ${category}**: ${stats.count} documents (${Math.round(stats.wordCount / stats.count).toLocaleString()} avg words)`;
  }).join('\n')}

## 🔍 Validation Results

${validation.errors.length > 0 ? `
### ❌ Errors (${validation.errors.length})

${validation.errors.map(error => 
  `- **${error.type}**: ${error.message}\n  - File: \`${error.filePath}\`\n  - Fix: ${error.suggestion || 'No suggestion'}`
).join('\n')}
` : '✅ No validation errors found.'}

${validation.warnings.length > 0 ? `
### ⚠️ Warnings (${validation.warnings.length})

${validation.warnings.slice(0, 10).map(warning => 
  `- **${warning.type}**: ${warning.message}\n  - File: \`${warning.filePath}\``
).join('\n')}

${validation.warnings.length > 10 ? `\n*... and ${validation.warnings.length - 10} more warnings*` : ''}
` : ''}

## 📄 Documents by Category

${this.generateMarkdownDocumentsList(documents)}

---

*Report generated by CIV Documentation Tracker v1.0.0*
`;
  }

  // Helper methods
  private getStatusIcon(status: string): string {
    switch (status) {
      case 'complete': return '✅';
      case 'draft': return '📝';
      case 'outdated': return '⚠️';
      case 'deprecated': return '🚫';
      default: return '📄';
    }
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  }

  private getCategoryStats(documents: DocumentMetadata[]) {
    const stats = new Map();
    for (const doc of documents) {
      if (!stats.has(doc.category)) {
        stats.set(doc.category, { count: 0, wordCount: 0 });
      }
      const categoryStats = stats.get(doc.category);
      categoryStats.count++;
      categoryStats.wordCount += doc.wordCount;
    }
    return stats;
  }

  private generateHtmlCategoryBreakdown(categoryStats: Map<string, any>): string {
    return `<h2>📁 Categories</h2>${Array.from(categoryStats.entries())
      .map(([category, stats]) => {
        const config = this.config.categories.get(category as any);
        const icon = config?.icon || '📄';
        return `<div class="category">
          <h3>${icon} ${category}</h3>
          <p>${stats.count} documents, ${Math.round(stats.wordCount / stats.count).toLocaleString()} average words</p>
        </div>`;
      }).join('')}`;
  }

  private generateHtmlValidationSection(validation: ValidationResult): string {
    let html = '<h2>🔍 Validation</h2>';
    
    if (validation.errors.length > 0) {
      html += validation.errors.map(error => 
        `<div class="error"><strong>${error.type}</strong>: ${error.message}<br><small>${error.filePath}</small></div>`
      ).join('');
    }

    if (validation.warnings.length > 0) {
      html += validation.warnings.slice(0, 5).map(warning => 
        `<div class="warning"><strong>${warning.type}</strong>: ${warning.message}<br><small>${warning.filePath}</small></div>`
      ).join('');
    }

    return html;
  }

  private generateHtmlDocumentsList(documents: DocumentMetadata[]): string {
    const byCategory = new Map();
    for (const doc of documents) {
      if (!byCategory.has(doc.category)) {
        byCategory.set(doc.category, []);
      }
      byCategory.get(doc.category).push(doc);
    }

    return `<h2>📄 All Documents</h2>${Array.from(byCategory.entries())
      .map(([category, docs]) => `
        <div class="category">
          <h3>${category}</h3>
          ${docs.map((doc: DocumentMetadata) => `
            <div class="document status-${doc.status}">
              <strong>${doc.title}</strong><br>
              <small>${doc.relativePath} | ${doc.wordCount.toLocaleString()} words | ${doc.status}</small>
              ${doc.description ? `<p>${doc.description}</p>` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}`;
  }

  private generateMarkdownDocumentsList(documents: DocumentMetadata[]): string {
    const byCategory = new Map();
    for (const doc of documents) {
      if (!byCategory.has(doc.category)) {
        byCategory.set(doc.category, []);
      }
      byCategory.get(doc.category).push(doc);
    }

    return Array.from(byCategory.entries())
      .map(([category, docs]) => {
        const config = this.config.categories.get(category as any);
        const icon = config?.icon || '📄';
        return `### ${icon} ${category}\n\n${docs.map((doc: DocumentMetadata) => 
          `- ${this.getStatusIcon(doc.status)} **${doc.title}** (\`${doc.relativePath}\`) - ${doc.wordCount.toLocaleString()} words\n${doc.description ? `  *${doc.description}*\n` : ''}`
        ).join('')}`;
      }).join('\n');
  }
}

export default DocumentationReporter;