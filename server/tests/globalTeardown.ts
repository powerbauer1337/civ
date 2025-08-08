export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any global resources
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Test environment cleanup complete');
}