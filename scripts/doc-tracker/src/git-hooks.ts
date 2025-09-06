/**
 * Git Hooks Integration
 * Integrates documentation tracking with Git workflow
 */

import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { DocTrackerConfig } from './types.js';
import DocumentScanner from './scanner.js';
import DocumentValidator from './validator.js';
import IndexUpdater from './updater.js';

export class GitHooksManager {
  constructor(private config: DocTrackerConfig) {}

  /**
   * Sets up Git hooks for automated documentation tracking
   */
  async setupGitHooks(): Promise<void> {
    const gitDir = path.join(process.cwd(), '.git');
    const hooksDir = path.join(gitDir, 'hooks');
    const projectHooksDir = path.join(process.cwd(), '.githooks');

    console.log(chalk.blue('🔧 Setting up Git hooks for documentation tracking...'));

    // Ensure hooks directory exists
    await fs.ensureDir(hooksDir);
    await fs.ensureDir(projectHooksDir);

    if (this.config.gitHooks.preCommit) {
      await this.setupPreCommitHook(hooksDir, projectHooksDir);
    }

    if (this.config.gitHooks.postCommit) {
      await this.setupPostCommitHook(hooksDir, projectHooksDir);
    }

    // Set up package.json scripts
    await this.setupPackageScripts();

    console.log(chalk.green('✅ Git hooks configured successfully'));
  }

  /**
   * Sets up pre-commit hook for validation
   */
  private async setupPreCommitHook(hooksDir: string, projectHooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, 'pre-commit');
    const projectHookPath = path.join(projectHooksDir, 'pre-commit');

    // Read existing hook if it exists
    let existingHook = '';
    if (await fs.pathExists(hookPath)) {
      existingHook = await fs.readFile(hookPath, 'utf-8');
    } else if (await fs.pathExists(projectHookPath)) {
      existingHook = await fs.readFile(projectHookPath, 'utf-8');
    }

    // Check if our hook is already present
    if (existingHook.includes('doc-tracker validation')) {
      console.log(chalk.yellow('Pre-commit hook already configured'));
      return;
    }

    const docTrackerHook = `
# Documentation Tracker Validation
echo "[pre-commit] Validating documentation..."
if [ -d "scripts/doc-tracker" ]; then
  npm run docs:validate 2>/dev/null || {
    echo "⚠️ Documentation validation failed"
    if [ "$DOC_TRACKER_STRICT" = "true" ]; then
      echo "❌ Commit rejected due to documentation validation errors"
      echo "Run 'npm run docs:fix' to automatically fix issues"
      exit 1
    else
      echo "⚠️ Proceeding with warnings (set DOC_TRACKER_STRICT=true to block)"
    fi
  }
fi
`;

    // Combine with existing hook
    const newHookContent = existingHook 
      ? `${existingHook.trim()}\n${docTrackerHook}`
      : `#!/usr/bin/env bash\nset -euo pipefail\n${docTrackerHook}`;

    // Write to project hooks first (for version control)
    await fs.writeFile(projectHookPath, newHookContent, 'utf-8');
    await fs.chmod(projectHookPath, 0o755);

    // Copy to Git hooks directory
    await fs.copy(projectHookPath, hookPath);
    await fs.chmod(hookPath, 0o755);

    console.log(chalk.green('✅ Pre-commit hook configured'));
  }

  /**
   * Sets up post-commit hook for auto-updates
   */
  private async setupPostCommitHook(hooksDir: string, projectHooksDir: string): Promise<void> {
    const hookPath = path.join(hooksDir, 'post-commit');
    const projectHookPath = path.join(projectHooksDir, 'post-commit');

    const docTrackerHook = `#!/usr/bin/env bash
# Auto-update documentation index after commit
if [ -d "scripts/doc-tracker" ]; then
  echo "[post-commit] Updating documentation index..."
  npm run docs:update --silent || echo "Warning: Could not update documentation index"
fi
`;

    await fs.writeFile(projectHookPath, docTrackerHook, 'utf-8');
    await fs.chmod(projectHookPath, 0o755);

    await fs.copy(projectHookPath, hookPath);
    await fs.chmod(hookPath, 0o755);

    console.log(chalk.green('✅ Post-commit hook configured'));
  }

  /**
   * Sets up package.json scripts for documentation management
   */
  private async setupPackageScripts(): Promise<void> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      console.log(chalk.yellow('⚠️ package.json not found, skipping script setup'));
      return;
    }

    const packageJson = await fs.readJson(packageJsonPath);
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    const docScripts = {
      'docs:scan': 'cd scripts/doc-tracker && npm run scan',
      'docs:update': 'cd scripts/doc-tracker && npm run update',
      'docs:validate': 'cd scripts/doc-tracker && npm run validate',
      'docs:report': 'cd scripts/doc-tracker && npm run report',
      'docs:setup-hooks': 'cd scripts/doc-tracker && npm run setup-hooks',
      'docs:fix': 'cd scripts/doc-tracker && npm run update && npm run validate'
    };

    let modified = false;
    for (const [script, command] of Object.entries(docScripts)) {
      if (!packageJson.scripts[script]) {
        packageJson.scripts[script] = command;
        modified = true;
      }
    }

    if (modified) {
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log(chalk.green('✅ Package.json scripts added'));
    }
  }

  /**
   * Validates documentation changes in pre-commit
   */
  async validatePreCommit(): Promise<boolean> {
    console.log(chalk.blue('🔍 Running pre-commit documentation validation...'));

    try {
      // Get staged files that are documentation
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      const { stdout } = await execAsync('git diff --cached --name-only');
      const stagedFiles = stdout.trim().split('\n').filter(Boolean);
      
      const docFiles = stagedFiles.filter(file => {
        const fullPath = path.join(process.cwd(), file);
        const scanner = new DocumentScanner(this.config);
        return scanner.shouldTrackFile(fullPath);
      });

      if (docFiles.length === 0) {
        console.log(chalk.green('✅ No documentation changes to validate'));
        return true;
      }

      console.log(chalk.gray(`Validating ${docFiles.length} documentation files...`));

      // Quick validation of changed files
      const validator = new DocumentValidator(this.config);
      let hasErrors = false;

      for (const file of docFiles) {
        const filePath = path.join(process.cwd(), file);
        const errors = await validator.validateFile(filePath);
        
        if (errors.length > 0) {
          hasErrors = true;
          console.log(chalk.red(`❌ ${file}:`));
          for (const error of errors) {
            console.log(chalk.red(`  - ${error.message}`));
            if (error.suggestion) {
              console.log(chalk.gray(`    Fix: ${error.suggestion}`));
            }
          }
        }
      }

      if (hasErrors) {
        if (this.config.gitHooks.failOnErrors) {
          console.log(chalk.red('❌ Commit blocked due to documentation validation errors'));
          console.log(chalk.yellow('💡 Run "npm run docs:fix" to automatically resolve issues'));
          return false;
        } else {
          console.log(chalk.yellow('⚠️ Documentation validation warnings (not blocking commit)'));
        }
      } else {
        console.log(chalk.green('✅ Documentation validation passed'));
      }

      return true;

    } catch (error) {
      console.error(chalk.red('❌ Error during pre-commit validation:'), error);
      return !this.config.gitHooks.failOnErrors;
    }
  }

  /**
   * Updates documentation index in post-commit
   */
  async updatePostCommit(): Promise<void> {
    console.log(chalk.blue('📝 Updating documentation index after commit...'));

    try {
      const scanner = new DocumentScanner(this.config);
      const updater = new IndexUpdater(this.config);

      // Scan and update
      const documents = await scanner.scanDocuments({ verbose: false });
      await updater.updateIndex(documents, { backup: false });

      console.log(chalk.green('✅ Documentation index updated'));

    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not update documentation index:'), error);
      // Don't fail post-commit
    }
  }

  /**
   * Removes Git hooks
   */
  async removeGitHooks(): Promise<void> {
    const gitDir = path.join(process.cwd(), '.git');
    const hooksDir = path.join(gitDir, 'hooks');

    console.log(chalk.blue('🗑️ Removing Git hooks...'));

    const hooks = ['pre-commit', 'post-commit'];
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, hook);
      if (await fs.pathExists(hookPath)) {
        const content = await fs.readFile(hookPath, 'utf-8');
        
        // Remove our sections
        const cleanedContent = content
          .replace(/\n# Documentation Tracker Validation[\s\S]*?(?=\n#|\n$|$)/g, '')
          .replace(/#!\/usr\/bin\/env bash\n# Auto-update documentation[\s\S]*?(?=\n#|\n$|$)/g, '')
          .trim();

        if (cleanedContent) {
          await fs.writeFile(hookPath, cleanedContent, 'utf-8');
        } else {
          await fs.remove(hookPath);
        }
      }
    }

    console.log(chalk.green('✅ Git hooks removed'));
  }

  /**
   * Checks Git hook status
   */
  async checkHooksStatus(): Promise<void> {
    const gitDir = path.join(process.cwd(), '.git');
    const hooksDir = path.join(gitDir, 'hooks');

    console.log(chalk.blue('📋 Git Hooks Status:'));

    const hooks = ['pre-commit', 'post-commit'];
    for (const hook of hooks) {
      const hookPath = path.join(hooksDir, hook);
      if (await fs.pathExists(hookPath)) {
        const content = await fs.readFile(hookPath, 'utf-8');
        const hasDocTracker = content.includes('doc-tracker') || content.includes('Documentation Tracker');
        
        if (hasDocTracker) {
          console.log(chalk.green(`✅ ${hook}: Documentation tracking enabled`));
        } else {
          console.log(chalk.yellow(`⚠️ ${hook}: Hook exists but no documentation tracking`));
        }
      } else {
        console.log(chalk.gray(`➖ ${hook}: Not configured`));
      }
    }

    // Check package.json scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const hasDocScripts = packageJson.scripts && Object.keys(packageJson.scripts).some(script => script.startsWith('docs:'));
      
      if (hasDocScripts) {
        console.log(chalk.green('✅ Package scripts: Documentation commands available'));
      } else {
        console.log(chalk.yellow('⚠️ Package scripts: No documentation commands found'));
      }
    }
  }
}

export default GitHooksManager;