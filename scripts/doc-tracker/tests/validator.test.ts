/**
 * Document Validator Tests
 */

import path from 'path';
import fs from 'fs-extra';
import DocumentValidator from '../src/validator';
import DocumentScanner from '../src/scanner';
import { createTestConfig, createTempTestDir, TEMP_DIR } from './setup';

describe('DocumentValidator', () => {
  let validator: DocumentValidator;
  let scanner: DocumentScanner;
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempTestDir('validator-test');
    const config = createTestConfig(testDir);
    config.docsDir = path.join(TEMP_DIR, 'docs');
    validator = new DocumentValidator(config);
    scanner = new DocumentScanner(config);
  });

  describe('validateDocumentation', () => {
    it('should validate all documents and return results', async () => {
      const documents = await scanner.scanDocuments({ verbose: false });
      const result = await validator.validateDocumentation(documents);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('coverage');
      
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should calculate coverage metrics correctly', async () => {
      const documents = await scanner.scanDocuments();
      const result = await validator.validateDocumentation(documents);
      
      expect(result.coverage.totalFiles).toBe(6);
      expect(result.coverage.trackedFiles).toBe(6);
      expect(result.coverage.coveragePercent).toBe(100);
      expect(result.coverage.categoryBreakdown.size).toBeGreaterThan(0);
    });

    it('should detect missing files', async () => {
      // Create a document that references a non-existent file
      const docsDir = path.join(TEMP_DIR, 'docs');
      const testDoc = path.join(docsDir, 'test-with-broken-link.md');
      await fs.writeFile(testDoc, '# Test\n\n[Broken Link](./non-existent.md)\n');
      
      const documents = await scanner.scanDocuments();
      const result = await validator.validateDocumentation(documents);
      
      const brokenLinkErrors = result.errors.filter(error => error.type === 'broken-link');
      expect(brokenLinkErrors.length).toBeGreaterThan(0);
    });

    it('should identify documents with missing descriptions', async () => {
      const documents = await scanner.scanDocuments();
      const result = await validator.validateDocumentation(documents);
      
      const missingDescWarnings = result.warnings.filter(warning => warning.type === 'no-description');
      expect(missingDescWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFile', () => {
    it('should validate a single file quickly', async () => {
      const filePath = path.join(TEMP_DIR, 'docs', 'technical', 'ARCHITECTURE.md');
      const errors = await validator.validateFile(filePath);
      
      expect(Array.isArray(errors)).toBe(true);
      // Should pass validation since it has proper title and frontmatter
      expect(errors.length).toBe(0);
    });

    it('should detect missing title', async () => {
      // Create a file without title
      const docsDir = path.join(TEMP_DIR, 'docs');
      const testFile = path.join(docsDir, 'no-title.md');
      await fs.writeFile(testFile, 'This file has no title heading.\n\nJust content.');
      
      const errors = await validator.validateFile(testFile);
      const titleErrors = errors.filter(error => error.type === 'missing-title');
      expect(titleErrors.length).toBeGreaterThan(0);
    });
  });
});