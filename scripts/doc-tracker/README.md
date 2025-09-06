# Documentation Tracker System

Automated documentation tracking system that maintains 100% coverage in PROJECT_INDEX.md whenever new documentation is created.

## Features

- **🔍 Automatic Scanning**: Detects all markdown files in the docs directory
- **📊 Metadata Extraction**: Extracts titles, descriptions, categories from frontmatter and content
- **🔄 Auto-Updates**: Automatically updates PROJECT_INDEX.md with new/changed documentation
- **✅ Validation**: Comprehensive validation of documentation completeness and quality
- **🔧 Git Integration**: Pre-commit hooks for validation and post-commit updates
- **📈 Coverage Reporting**: Detailed reports on documentation coverage and gaps
- **🏷️ Smart Categorization**: Automatic categorization based on directory structure and content

## Quick Start

```bash
# Initialize in your project
cd scripts/doc-tracker
npm install

# Scan documentation and update index
npm run scan
npm run update

# Validate documentation
npm run validate

# Generate coverage report
npm run report

# Setup Git hooks for automatic tracking
npm run setup-hooks
```

## Commands

### Core Operations

```bash
# Scan all documentation files
npx tsx src/index.ts scan [--verbose] [--force]

# Update PROJECT_INDEX.md
npx tsx src/index.ts update [--dry-run] [--no-backup]

# Validate documentation
npx tsx src/index.ts validate [--file <path>]

# Generate reports
npx tsx src/index.ts report [--format json|html|markdown] [--output <file>]

# Check status
npx tsx src/index.ts status
```

### Git Integration

```bash
# Setup Git hooks
npx tsx src/index.ts setup-hooks

# Remove Git hooks
npx tsx src/index.ts remove-hooks

# Manual pre-commit validation
npx tsx src/index.ts pre-commit

# Manual post-commit update
npx tsx src/index.ts post-commit
```

### Project Integration

```bash
# Initialize in new project
npx tsx src/index.ts init [--with-hooks]
```

## Configuration

Create `doc-tracker.config.js` in your project root:

```javascript
module.exports = {
  docsDir: './docs',
  indexPath: './docs/PROJECT_INDEX.md',
  
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
};
```

## Document Categories

The system automatically categorizes documents based on:

- **🏗️ Technical**: Architecture, system design, technical specs
- **📚 API**: API documentation, endpoints, integration guides  
- **👥 User**: User guides, tutorials, end-user docs
- **⚙️ Setup**: Installation, development setup, configuration
- **🚀 Deployment**: Production deployment, infrastructure, operations
- **📊 Analysis**: Project analysis, audit reports, planning docs
- **📦 Archive**: Deprecated and historical documentation
- **🎨 Visual Concepts**: Design mockups, diagrams, visual docs
- **📋 Root**: Top-level project documentation and overviews

## Frontmatter Support

Enhance document metadata with frontmatter:

```yaml
---
title: System Architecture Guide
description: Comprehensive guide to system architecture patterns
category: technical
subcategory: backend
tags: [architecture, microservices, api]
priority: high
status: complete
---
```

## Git Hooks Integration

### Pre-commit Hook
- Validates documentation changes
- Checks for missing titles, descriptions
- Validates internal links
- Can block commits with validation errors

### Post-commit Hook
- Automatically updates PROJECT_INDEX.md
- Runs after successful commits
- Ensures index stays synchronized

### Environment Variables

```bash
# Strict mode - fail commits on validation errors
export DOC_TRACKER_STRICT=true

# Skip validation for emergency commits
export DOC_TRACKER_SKIP=true
```

## Validation Rules

### Required Elements
- ✅ Document titles (configurable)
- ✅ Valid categories
- ✅ Working internal links
- ✅ Unique titles across project

### Quality Checks
- ⚠️ Minimum word count
- ⚠️ Missing descriptions
- ⚠️ Outdated documents (age-based)
- ⚠️ Large file sizes
- ⚠️ Draft status documents

### Coverage Metrics
- 📊 Total documentation coverage percentage
- 📊 Category distribution
- 📊 Missing files not in index
- 📊 Orphaned index entries

## Reporting Formats

### Console Output
```bash
npm run report
```
Interactive console report with color-coded results.

### JSON Report
```bash
npm run report -- --format json --output report.json
```
Structured data for programmatic analysis.

### HTML Report
```bash
npm run report -- --format html --output report.html
```
Rich HTML dashboard with interactive elements.

### Markdown Report
```bash
npm run report -- --format markdown --output DOCUMENTATION_REPORT.md
```
Markdown report for inclusion in project documentation.

## Package.json Scripts

The system automatically adds these scripts to your package.json:

```json
{
  "scripts": {
    "docs:scan": "cd scripts/doc-tracker && npm run scan",
    "docs:update": "cd scripts/doc-tracker && npm run update",
    "docs:validate": "cd scripts/doc-tracker && npm run validate",
    "docs:report": "cd scripts/doc-tracker && npm run report",
    "docs:fix": "cd scripts/doc-tracker && npm run update && npm run validate"
  }
}
```

## Advanced Usage

### Custom Category Rules

Extend categorization logic by modifying `CATEGORY_PATTERNS` in config:

```javascript
const CUSTOM_PATTERNS = new Map([
  ['security', [/security/i, /auth/i, /encryption/i]],
  ['performance', [/performance/i, /optimization/i, /benchmark/i]]
]);
```

### Template Customization

Customize how documents appear in the index:

```javascript
const categoryConfig = {
  name: '🔒 Security Documentation',
  template: '### [{{title}}]({{path}})\n**{{description}}**\n- Security Level: High\n- Last Review: {{lastModified}}\n'
};
```

### Integration with CI/CD

```yaml
# .github/workflows/docs.yml
name: Documentation Validation
on: [pull_request]
jobs:
  validate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate Documentation
        run: |
          cd scripts/doc-tracker
          npm ci
          npm run validate
```

## Troubleshooting

### Common Issues

1. **"Config not found"**
   - Create `doc-tracker.config.js` or use default configuration

2. **"Git hooks not working"**
   - Ensure hooks are executable: `chmod +x .githooks/*`
   - Check Git config: `git config core.hooksPath .githooks`

3. **"Validation fails"**
   - Run `npm run docs:fix` to auto-resolve common issues
   - Check validation output for specific problems

4. **"Index not updating"**
   - Verify permissions on PROJECT_INDEX.md
   - Check if file is locked by another process

### Debug Mode

```bash
# Verbose output for debugging
npm run scan -- --verbose
npm run validate -- --verbose
npm run update -- --verbose
```

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm test
npm run test:coverage
```

### Type Checking
```bash
npm run typecheck
```

## Architecture

The system consists of five main components:

1. **Scanner** (`scanner.ts`) - Discovers and analyzes documentation files
2. **Validator** (`validator.ts`) - Validates documentation quality and completeness  
3. **Updater** (`updater.ts`) - Updates PROJECT_INDEX.md with current structure
4. **Reporter** (`reporter.ts`) - Generates comprehensive coverage reports
5. **Git Hooks** (`git-hooks.ts`) - Integrates with Git workflow for automation

## Contributing

1. Follow TypeScript strict mode guidelines
2. Add tests for new features
3. Update documentation for API changes
4. Ensure Git hooks integration works
5. Test with various documentation structures

## License

MIT License - see LICENSE file for details.

---

*Generated by CIV Documentation Tracker v1.0.0*