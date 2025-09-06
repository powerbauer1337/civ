/**
 * Test Setup
 * Global test configuration and utilities
 */

import fs from 'fs-extra';
import path from 'path';
import { tmpdir } from 'os';

// Global test timeout
jest.setTimeout(30000);

// Test data directory
export const TEST_DATA_DIR = path.join(__dirname, 'data');
export const TEMP_DIR = path.join(tmpdir(), 'doc-tracker-tests');

// Setup test environment
beforeAll(async () => {
  // Ensure test data directory exists
  await fs.ensureDir(TEST_DATA_DIR);
  await fs.ensureDir(TEMP_DIR);
  
  // Create sample documentation files for testing
  await createTestDocuments();
});

// Cleanup after tests
afterAll(async () => {
  // Clean up temporary directory
  await fs.remove(TEMP_DIR);
});

/**
 * Creates sample documentation files for testing
 */
export async function createTestDocuments(): Promise<void> {
  const docsDir = path.join(TEMP_DIR, 'docs');
  
  // Create directory structure
  await fs.ensureDir(docsDir);
  await fs.ensureDir(path.join(docsDir, 'technical'));
  await fs.ensureDir(path.join(docsDir, 'api'));
  await fs.ensureDir(path.join(docsDir, 'user'));
  await fs.ensureDir(path.join(docsDir, 'archive'));

  // Create test documents
  const documents = [
    {
      path: 'PROJECT_INDEX.md',
      content: `# Test Project Documentation\n\nProject overview and index.\n\n## Technical\n- [Architecture](./technical/ARCHITECTURE.md)\n`
    },
    {
      path: 'technical/ARCHITECTURE.md',
      content: `---\ntitle: System Architecture\ndescription: High-level system design\ncategory: technical\ntags: [architecture, design]\n---\n\n# System Architecture\n\nThis document describes the system architecture.\n\n## Overview\n\nThe system follows a microservices pattern.\n`
    },
    {
      path: 'api/REST_API.md',
      content: `# REST API Documentation\n\nComplete API reference for all endpoints.\n\n## Authentication\n\nUse Bearer tokens.\n`
    },
    {
      path: 'user/USER_GUIDE.md',
      content: `---\ntitle: User Guide\ndescription: How to use the application\nstatus: draft\n---\n\n# User Guide\n\nWork in progress user documentation.\n`
    },
    {
      path: 'archive/OLD_README.md',
      content: `# Old README\n\nThis is deprecated documentation.\n`
    },
    {
      path: 'CHANGELOG.md',
      content: `# Changelog\n\n## v1.0.0\n- Initial release\n`
    }
  ];

  for (const doc of documents) {
    const filePath = path.join(docsDir, doc.path);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, doc.content);
  }
}

/**
 * Helper to create temporary directory for test
 */
export async function createTempTestDir(testName: string): Promise<string> {
  const testDir = path.join(TEMP_DIR, testName);
  await fs.ensureDir(testDir);
  return testDir;
}

/**
 * Helper to create test configuration
 */
export function createTestConfig(baseDir: string) {
  const { createDefaultConfig } = require('../src/config');
  return createDefaultConfig(baseDir);
}

/**
 * Custom matchers for testing
 */
expect.extend({
  toBeValidDocument(received: any) {
    const pass = received && 
      typeof received.title === 'string' &&
      typeof received.filePath === 'string' &&
      typeof received.category === 'string' &&
      received.lastModified instanceof Date;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid document`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid document`,
        pass: false
      };
    }
  },

  toHaveValidationErrors(received: any, expectedCount?: number) {
    const pass = received && 
      Array.isArray(received.errors) &&
      (expectedCount === undefined || received.errors.length === expectedCount);

    if (pass) {
      return {
        message: () => `expected validation result not to have ${expectedCount || 'any'} errors`,
        pass: true
      };
    } else {
      return {
        message: () => `expected validation result to have ${expectedCount || 'some'} errors, got ${received?.errors?.length || 0}`,
        pass: false
      };
    }
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidDocument(): R;
      toHaveValidationErrors(expectedCount?: number): R;
    }
  }
}