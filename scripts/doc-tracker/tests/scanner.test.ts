/**
 * Document Scanner Tests
 */

import path from 'path';
import DocumentScanner from '../src/scanner';
import { createTestConfig, createTempTestDir, TEMP_DIR } from './setup';

describe('DocumentScanner', () => {
  let scanner: DocumentScanner;
  let testDir: string;

  beforeEach(async () => {
    testDir = await createTempTestDir('scanner-test');
    const config = createTestConfig(testDir);
    config.docsDir = path.join(TEMP_DIR, 'docs');
    scanner = new DocumentScanner(config);
  });

  describe('scanDocuments', () => {
    it('should scan and return document metadata', async () => {
      const documents = await scanner.scanDocuments({ verbose: false });
      
      expect(documents).toHaveLength(6);
      expect(documents[0]).toBeValidDocument();
      
      // Check specific documents
      const archDoc = documents.find(doc => doc.title === 'System Architecture');
      expect(archDoc).toBeDefined();
      expect(archDoc?.category).toBe('technical');
      expect(archDoc?.hasFrontmatter).toBe(true);
      expect(archDoc?.description).toContain('High-level system design');
    });

    it('should categorize documents correctly', async () => {
      const documents = await scanner.scanDocuments();
      
      const categories = new Set(documents.map(doc => doc.category));
      expect(categories).toContain('technical');
      expect(categories).toContain('api');
      expect(categories).toContain('user');
      expect(categories).toContain('archive');
      expect(categories).toContain('root');
    });

    it('should extract metadata from frontmatter', async () => {
      const documents = await scanner.scanDocuments();
      
      const userGuide = documents.find(doc => doc.title === 'User Guide');
      expect(userGuide).toBeDefined();
      expect(userGuide?.status).toBe('draft');
      expect(userGuide?.hasFrontmatter).toBe(true);
    });

    it('should calculate word counts', async () => {
      const documents = await scanner.scanDocuments();
      
      const archDoc = documents.find(doc => doc.title === 'System Architecture');
      expect(archDoc?.wordCount).toBeGreaterThan(10);
    });

    it('should exclude archived documents when requested', async () => {
      const documentsWithArchive = await scanner.scanDocuments({ includeArchived: true });
      const documentsWithoutArchive = await scanner.scanDocuments({ includeArchived: false });
      
      expect(documentsWithArchive.length).toBeGreaterThan(documentsWithoutArchive.length);
      
      const hasArchive = documentsWithoutArchive.some(doc => doc.category === 'archive');
      expect(hasArchive).toBe(false);
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata from a single file', async () => {
      const filePath = path.join(TEMP_DIR, 'docs', 'technical', 'ARCHITECTURE.md');
      const metadata = await scanner.extractMetadata(filePath);
      
      expect(metadata).toBeValidDocument();
      expect(metadata?.title).toBe('System Architecture');
      expect(metadata?.category).toBe('technical');
      expect(metadata?.tags).toEqual(['architecture', 'design']);
    });

    it('should handle files without frontmatter', async () => {
      const filePath = path.join(TEMP_DIR, 'docs', 'api', 'REST_API.md');
      const metadata = await scanner.extractMetadata(filePath);
      
      expect(metadata).toBeValidDocument();
      expect(metadata?.title).toBe('REST API Documentation');
      expect(metadata?.hasFrontmatter).toBe(false);
      expect(metadata?.category).toBe('api');
    });

    it('should determine document priority', async () => {
      const documents = await scanner.scanDocuments();
      
      const indexDoc = documents.find(doc => doc.relativePath.includes('PROJECT_INDEX'));
      const archiveDoc = documents.find(doc => doc.category === 'archive');
      
      expect(indexDoc?.priority).toBe('high');
      expect(archiveDoc?.priority).toBe('low');
    });
  });

  describe('shouldTrackFile', () => {
    it('should track markdown files in docs directory', () => {
      const mdFile = path.join(TEMP_DIR, 'docs', 'test.md');
      expect(scanner.shouldTrackFile(mdFile)).toBe(true);
    });

    it('should exclude files matching exclude patterns', () => {
      const nodeModulesFile = path.join(TEMP_DIR, 'docs', 'node_modules', 'test.md');
      expect(scanner.shouldTrackFile(nodeModulesFile)).toBe(false);
    });

    it('should exclude non-markdown files', () => {
      const txtFile = path.join(TEMP_DIR, 'docs', 'test.txt');
      expect(scanner.shouldTrackFile(txtFile)).toBe(false);
    });
  });
});