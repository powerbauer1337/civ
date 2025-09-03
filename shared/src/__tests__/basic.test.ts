/**
 * @fileoverview Basic tests for shared package
 */

describe('Shared Package Basic Tests', () => {
  test('package imports without errors', () => {
    expect(() => {
      require('../index');
    }).not.toThrow();
  });

  test('has basic structure', () => {
    const pkg = require('../index');
    expect(typeof pkg).toBe('object');
  });

  test('math still works', () => {
    expect(2 + 2).toBe(4);
  });
});
