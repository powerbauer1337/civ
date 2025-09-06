#!/usr/bin/env node

/**
 * Documentation Tracker CLI
 * Main entry point for the automated documentation tracking system
 */

import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';

import { loadConfig } from './config.js';
import DocumentScanner from './scanner.js';
import DocumentValidator from './validator.js';
import IndexUpdater from './updater.js';
import DocumentationReporter from './reporter.js';
import GitHooksManager from './git-hooks.js';
import type { ScanOptions, UpdateOptions, ReportOptions } from './types.js';

const program = new Command();

program
  .name('doc-tracker')
  .description('Automated documentation tracking system for PROJECT_INDEX.md')
  .version('1.0.0');

// Scan command
program
  .command('scan')
  .description('Scan documentation files and extract metadata')
  .option('-f, --force', 'Force rescan of all files')
  .option('-a, --include-archived', 'Include archived documents', true)
  .option('-v, --verbose', 'Verbose output')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📚 Documentation Scanner\n'));
      
      const config = loadConfig(options.config);
      const scanner = new DocumentScanner(config);
      
      const scanOptions: ScanOptions = {
        force: options.force,
        includeArchived: options.includeArchived,
        verbose: options.verbose
      };

      const documents = await scanner.scanDocuments(scanOptions);
      
      console.log(chalk.green(`\n✅ Successfully scanned ${documents.length} documents`));
      
      if (!options.verbose) {
        console.log(chalk.gray('Use --verbose for detailed output'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error during scan:'), error);
      process.exit(1);
    }
  });

// Update command
program
  .command('update')
  .description('Update PROJECT_INDEX.md with current documentation')
  .option('--dry-run', 'Preview changes without making them')
  .option('--no-backup', 'Skip creating backup')
  .option('-f, --force', 'Force update even with warnings')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📝 Documentation Index Updater\n'));
      
      const config = loadConfig(options.config);
      const scanner = new DocumentScanner(config);
      const updater = new IndexUpdater(config);
      
      // Scan documents
      console.log(chalk.blue('Scanning documents...'));
      const documents = await scanner.scanDocuments({ verbose: false });
      
      const updateOptions: UpdateOptions = {
        dryRun: options.dryRun,
        backup: options.backup !== false,
        force: options.force
      };

      // Update index
      await updater.updateIndex(documents, updateOptions);
      
    } catch (error) {
      console.error(chalk.red('❌ Error during update:'), error);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate documentation completeness and quality')
  .option('-c, --config <path>', 'Config file path')
  .option('--file <path>', 'Validate specific file')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🔍 Documentation Validator\n'));
      
      const config = loadConfig(options.config);
      const validator = new DocumentValidator(config);
      
      if (options.file) {
        // Validate single file
        const errors = await validator.validateFile(path.resolve(options.file));
        
        if (errors.length === 0) {
          console.log(chalk.green('✅ File validation passed'));
          process.exit(0);
        } else {
          console.log(chalk.red(`❌ Found ${errors.length} validation errors:`));
          for (const error of errors) {
            console.log(chalk.red(`  - ${error.message}`));
            if (error.suggestion) {
              console.log(chalk.gray(`    Fix: ${error.suggestion}`));
            }
          }
          process.exit(1);
        }
      } else {
        // Validate all documentation
        const scanner = new DocumentScanner(config);
        const documents = await scanner.scanDocuments({ verbose: false });
        const result = await validator.validateDocumentation(documents);
        
        if (result.isValid) {
          console.log(chalk.green('✅ All validations passed'));
          process.exit(0);
        } else {
          console.log(chalk.red(`❌ Validation failed with ${result.errors.length} errors`));
          process.exit(1);
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error during validation:'), error);
      process.exit(1);
    }
  });

// Report command
program
  .command('report')
  .description('Generate documentation coverage and quality report')
  .option('-f, --format <format>', 'Report format (console|json|html|markdown)', 'console')
  .option('-o, --output <path>', 'Output file path')
  .option('-d, --detailed', 'Include detailed information')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📊 Documentation Reporter\n'));
      
      const config = loadConfig(options.config);
      const scanner = new DocumentScanner(config);
      const validator = new DocumentValidator(config);
      const reporter = new DocumentationReporter(config);
      
      // Scan and validate
      const documents = await scanner.scanDocuments({ verbose: false });
      const validation = await validator.validateDocumentation(documents);
      
      const reportOptions: ReportOptions = {
        format: options.format as any,
        outputPath: options.output,
        detailed: options.detailed
      };

      await reporter.generateReport(documents, validation, reportOptions);
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating report:'), error);
      process.exit(1);
    }
  });

// Setup hooks command
program
  .command('setup-hooks')
  .description('Setup Git hooks for automated documentation tracking')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🔧 Git Hooks Setup\n'));
      
      const config = loadConfig(options.config);
      const hooksManager = new GitHooksManager(config);
      
      await hooksManager.setupGitHooks();
      
    } catch (error) {
      console.error(chalk.red('❌ Error setting up hooks:'), error);
      process.exit(1);
    }
  });

// Remove hooks command
program
  .command('remove-hooks')
  .description('Remove Git hooks for documentation tracking')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🗑️ Removing Git Hooks\n'));
      
      const config = loadConfig(options.config);
      const hooksManager = new GitHooksManager(config);
      
      await hooksManager.removeGitHooks();
      
    } catch (error) {
      console.error(chalk.red('❌ Error removing hooks:'), error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show documentation tracking status')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('📋 Documentation Tracking Status\n'));
      
      const config = loadConfig(options.config);
      const scanner = new DocumentScanner(config);
      const validator = new DocumentValidator(config);
      const hooksManager = new GitHooksManager(config);
      
      // Quick scan
      const documents = await scanner.scanDocuments({ verbose: false });
      const validation = await validator.validateDocumentation(documents);
      
      // Status summary
      console.log(chalk.bold('📊 Summary:'));
      console.log(chalk.green(`  Documents: ${documents.length}`));
      console.log(chalk.green(`  Coverage: ${validation.coverage.coveragePercent}%`));
      console.log(validation.isValid 
        ? chalk.green('  Validation: ✅ Passed')
        : chalk.red(`  Validation: ❌ Failed (${validation.errors.length} errors)`)
      );
      
      console.log(chalk.green(`  Categories: ${validation.coverage.categoryBreakdown.size}`));
      
      if (validation.coverage.missingFiles.length > 0) {
        console.log(chalk.yellow(`  Missing from index: ${validation.coverage.missingFiles.length} files`));
      }
      
      console.log();
      await hooksManager.checkHooksStatus();
      
    } catch (error) {
      console.error(chalk.red('❌ Error checking status:'), error);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize documentation tracking in current project')
  .option('--with-hooks', 'Setup Git hooks immediately', true)
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('🚀 Initializing Documentation Tracker\n'));
      
      const trackerDir = path.join(process.cwd(), 'scripts', 'doc-tracker');
      
      // Check if already initialized
      if (await fs.pathExists(trackerDir)) {
        console.log(chalk.yellow('⚠️ Documentation tracker already initialized'));
        return;
      }

      // Create directory structure
      console.log(chalk.blue('Creating directory structure...'));
      await fs.ensureDir(trackerDir);
      
      // Copy source files (this would be done differently in a real package)
      console.log(chalk.blue('Installing tracker files...'));
      
      // Install dependencies
      console.log(chalk.blue('Installing dependencies...'));
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      await execAsync('npm install', { cwd: trackerDir });
      
      // Setup initial scan and update
      console.log(chalk.blue('Performing initial scan...'));
      const config = loadConfig();
      const scanner = new DocumentScanner(config);
      const updater = new IndexUpdater(config);
      
      const documents = await scanner.scanDocuments({ verbose: false });
      await updater.updateIndex(documents);
      
      // Setup hooks if requested
      if (options.withHooks) {
        console.log(chalk.blue('Setting up Git hooks...'));
        const hooksManager = new GitHooksManager(config);
        await hooksManager.setupGitHooks();
      }
      
      console.log(chalk.green('\n✅ Documentation tracker initialized successfully!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  • Run "npm run docs:validate" to check documentation'));
      console.log(chalk.gray('  • Run "npm run docs:report" to generate coverage report'));
      console.log(chalk.gray('  • Documentation will be automatically tracked on git commits'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error during initialization:'), error);
      process.exit(1);
    }
  });

// Pre-commit hook handler
program
  .command('pre-commit')
  .description('Internal: Handle pre-commit validation')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    const config = loadConfig(options.config);
    const hooksManager = new GitHooksManager(config);
    
    const success = await hooksManager.validatePreCommit();
    process.exit(success ? 0 : 1);
  });

// Post-commit hook handler
program
  .command('post-commit')
  .description('Internal: Handle post-commit update')
  .option('-c, --config <path>', 'Config file path')
  .action(async (options) => {
    const config = loadConfig(options.config);
    const hooksManager = new GitHooksManager(config);
    
    await hooksManager.updatePostCommit();
  });

// Error handling
program.exitOverride();

program.parseAsync(process.argv).catch(error => {
  if (error.code !== 'commander.helpDisplayed' && error.code !== 'commander.version') {
    console.error(chalk.red('❌ Unexpected error:'), error);
    process.exit(1);
  }
});

export default program;