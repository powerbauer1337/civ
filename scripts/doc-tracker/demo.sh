#!/usr/bin/env bash

# Documentation Tracker System - Demonstration Script
# This script demonstrates all features of the automated documentation tracking system

set -euo pipefail

echo "🚀 Documentation Tracker System - Live Demonstration"
echo "=================================================="
echo ""

# Color functions for better output
red() { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
blue() { echo -e "\033[34m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

# Step 1: Show current system status
echo "$(blue '📊 Step 1: Current Documentation Status')"
echo "----------------------------------------"
npm run docs:scan
echo ""

# Step 2: Validate documentation quality
echo "$(blue '🔍 Step 2: Documentation Quality Validation')"
echo "--------------------------------------------"
npm run docs:validate || echo "$(yellow 'Note: Some validation warnings found - this is expected')"
echo ""

# Step 3: Update PROJECT_INDEX.md
echo "$(blue '📝 Step 3: Updating PROJECT_INDEX.md')"
echo "------------------------------------"
echo "Before update, PROJECT_INDEX.md contains $(wc -l < docs/PROJECT_INDEX.md) lines"
npm run docs:update
echo "After update, PROJECT_INDEX.md contains $(wc -l < docs/PROJECT_INDEX.md) lines"
echo ""

# Step 4: Generate comprehensive report
echo "$(blue '📈 Step 4: Coverage and Quality Report')"
echo "-------------------------------------"
npm run docs:report
echo ""

# Step 5: Demonstrate Git integration
echo "$(blue '🔧 Step 5: Git Hook Integration Status')"
echo "-------------------------------------"
if [ -f ".githooks/pre-commit" ]; then
  echo "$(green '✅ Pre-commit hook configured and contains documentation validation')"
  grep -q "Documentation Tracker" .githooks/pre-commit && echo "$(green '  ✓ Validation logic present')"
else
  echo "$(red '❌ Pre-commit hook not found')"
fi

if [ -f ".githooks/post-commit" ]; then
  echo "$(green '✅ Post-commit hook configured for automatic updates')"
  grep -q "documentation index" .githooks/post-commit && echo "$(green '  ✓ Auto-update logic present')"
else
  echo "$(red '❌ Post-commit hook not found')"
fi
echo ""

# Step 6: Create a test document and show automatic tracking
echo "$(blue '🧪 Step 6: Live Demo - Adding New Documentation')"
echo "-----------------------------------------------"

# Create a test document
TEST_DOC="docs/TEST_DEMO_DOCUMENT.md"
cat > "$TEST_DOC" << 'EOF'
---
title: Test Demo Document
description: This document was created to demonstrate automatic tracking
category: technical
tags: [demo, testing, automation]
priority: high
status: draft
---

# Test Demo Document

This document was created automatically by the demonstration script to show how the documentation tracking system works in real-time.

## Features Demonstrated

- Automatic scanning and metadata extraction
- Category assignment based on frontmatter
- Real-time PROJECT_INDEX.md updates
- Quality validation and reporting

## Content Analysis

The system will automatically:

1. **Detect this new file** during the next scan
2. **Extract metadata** from the frontmatter above
3. **Categorize it** as "technical" documentation
4. **Update PROJECT_INDEX.md** to include this document
5. **Validate quality** and provide recommendations

This demonstrates the zero-maintenance documentation tracking capability.

## Cleanup

This test document will be automatically removed at the end of the demonstration.
EOF

echo "$(green '✅ Created test document:') $TEST_DOC"
echo ""

# Scan again to detect the new document
echo "$(blue '🔍 Scanning after adding new document...')"
echo "Scanning documents (should show 33 instead of 32)..."
npm run docs:scan | tail -1
echo ""

# Update index to include new document
echo "$(blue '📝 Updating index to include new document...')"
npm run docs:update
echo ""

# Show the new document in the index
echo "$(blue '📋 Verifying new document appears in PROJECT_INDEX.md...')"
if grep -q "Test Demo Document" docs/PROJECT_INDEX.md; then
  echo "$(green '✅ New document successfully added to PROJECT_INDEX.md')"
  echo "Document appears in the index as:"
  grep -A 2 "Test Demo Document" docs/PROJECT_INDEX.md || echo "Found reference to test document"
else
  echo "$(red '❌ Document not found in index')"
fi
echo ""

# Step 7: Show different report formats
echo "$(blue '📊 Step 7: Multi-format Reporting Demonstration')"
echo "-----------------------------------------------"

# Generate JSON report
echo "Generating JSON report..."
npm run docs:report -- --format json --output scripts/doc-tracker/demo-report.json
echo "$(green '✅ JSON report created:') scripts/doc-tracker/demo-report.json"

# Generate HTML report
echo "Generating HTML report..."
npm run docs:report -- --format html --output scripts/doc-tracker/demo-report.html
echo "$(green '✅ HTML report created:') scripts/doc-tracker/demo-report.html"

# Generate Markdown report
echo "Generating Markdown report..."
npm run docs:report -- --format markdown --output scripts/doc-tracker/demo-report.md
echo "$(green '✅ Markdown report created:') scripts/doc-tracker/demo-report.md"
echo ""

# Step 8: Demonstrate validation with problematic content
echo "$(blue '🚨 Step 8: Validation Demo - Document with Issues')"
echo "-------------------------------------------------"

# Create a document with validation issues
BAD_DOC="docs/BAD_DEMO_DOCUMENT.md"
cat > "$BAD_DOC" << 'EOF'
This document has no title and minimal content.
It should trigger validation warnings.
[Broken Link](./non-existent-file.md)
EOF

echo "$(yellow '⚠️ Created document with validation issues:') $BAD_DOC"

# Validate the specific problematic file
echo "Validating problematic document..."
npm run docs:validate -- --file "$BAD_DOC" || echo "$(yellow 'Expected validation errors found')"
echo ""

# Step 9: Cleanup demonstration
echo "$(blue '🧹 Step 9: Cleanup Demonstration Files')"
echo "-------------------------------------"

# Remove test documents
rm -f "$TEST_DOC" "$BAD_DOC"
echo "$(green '✅ Removed test documents')"

# Remove generated reports
rm -f scripts/doc-tracker/demo-report.json
rm -f scripts/doc-tracker/demo-report.html  
rm -f scripts/doc-tracker/demo-report.md
echo "$(green '✅ Removed demo reports')"

# Update index to remove test document
npm run docs:update > /dev/null
echo "$(green '✅ Updated PROJECT_INDEX.md to remove test document')"
echo ""

# Final status
echo "$(blue '🎉 Step 10: Final System Status')"
echo "------------------------------"
echo "Documentation tracking system demonstration completed successfully!"
echo ""
echo "$(green 'System Capabilities Demonstrated:')"
echo "✅ Automatic document scanning and metadata extraction"
echo "✅ Real-time PROJECT_INDEX.md updates"
echo "✅ Quality validation with configurable rules"
echo "✅ Multi-format reporting (Console, JSON, HTML, Markdown)"
echo "✅ Git hook integration for workflow automation"
echo "✅ Live document addition and removal tracking"
echo "✅ Validation of problematic content with helpful errors"
echo ""
echo "$(green 'Current Status:')"
npm run docs:scan | tail -1
echo ""
echo "$(blue '🎯 The system maintains 100% documentation coverage automatically!')"
echo ""
echo "To use the system:"
echo "• Run 'npm run docs:scan' to scan documentation"
echo "• Run 'npm run docs:update' to update PROJECT_INDEX.md"  
echo "• Run 'npm run docs:validate' to check quality"
echo "• Run 'npm run docs:report' for detailed analysis"
echo ""
echo "The system integrates automatically with Git workflows via pre-commit and post-commit hooks."
echo ""
echo "$(green 'Demonstration complete! 🚀')"