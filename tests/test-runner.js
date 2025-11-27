/**
 * Simple Test Runner for Backend Tests
 * Run with: node tests/test-runner.js
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  errors: []
};

async function runTests() {
  console.log('🧪 Starting Test Suite...\n');
  console.log('='.repeat(60));
  
  try {
    const testDir = join(__dirname);
    const files = await readdir(testDir);
    const testFiles = files.filter(f => f.startsWith('test-') && f.endsWith('.js'));
    
    for (const testFile of testFiles) {
      try {
        console.log(`\n📋 Running: ${testFile}`);
        const testModule = await import(`./${testFile}`);
        if (testModule.runTests) {
          await testModule.runTests();
          testResults.passed++;
        } else {
          console.log(`⚠️  ${testFile} has no runTests export`);
        }
      } catch (error) {
        console.error(`❌ Error in ${testFile}:`, error.message);
        testResults.failed++;
        testResults.errors.push({ file: testFile, error: error.message });
      }
      testResults.total++;
    }
  } catch (error) {
    console.error('❌ Error loading tests:', error);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Total:  ${testResults.total}`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests();



