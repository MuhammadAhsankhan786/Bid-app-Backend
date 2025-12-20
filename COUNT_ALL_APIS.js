/**
 * Count All APIs in Backend
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const routesDir = path.join(__dirname, 'src', 'Routes');
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

let totalAPIs = 0;
const apiBreakdown = {};

console.log('🔍 Counting All APIs in Backend...\n');
console.log('='.repeat(80));

for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Count router.get, router.post, router.put, router.patch, router.delete
  const getCount = (content.match(/router\.get\(/g) || []).length;
  const postCount = (content.match(/router\.post\(/g) || []).length;
  const putCount = (content.match(/router\.put\(/g) || []).length;
  const patchCount = (content.match(/router\.patch\(/g) || []).length;
  const deleteCount = (content.match(/router\.delete\(/g) || []).length;
  
  const fileTotal = getCount + postCount + putCount + patchCount + deleteCount;
  totalAPIs += fileTotal;
  
  if (fileTotal > 0) {
    apiBreakdown[file] = {
      GET: getCount,
      POST: postCount,
      PUT: putCount,
      PATCH: patchCount,
      DELETE: deleteCount,
      Total: fileTotal
    };
  }
}

console.log('📊 API Breakdown by Route File:\n');

for (const [file, counts] of Object.entries(apiBreakdown)) {
  console.log(`📁 ${file}:`);
  console.log(`   GET: ${counts.GET}`);
  console.log(`   POST: ${counts.POST}`);
  console.log(`   PUT: ${counts.PUT}`);
  console.log(`   PATCH: ${counts.PATCH}`);
  console.log(`   DELETE: ${counts.DELETE}`);
  console.log(`   Total: ${counts.Total}`);
  console.log('');
}

console.log('='.repeat(80));
console.log(`📈 TOTAL APIs: ${totalAPIs}`);
console.log('='.repeat(80));

// Also count from test script
const testScriptPath = path.join(__dirname, 'test-all-apis-comprehensive.js');
if (fs.existsSync(testScriptPath)) {
  const testContent = fs.readFileSync(testScriptPath, 'utf8');
  const testAPIs = (testContent.match(/\{ method:/g) || []).length;
  console.log(`\n📋 APIs in Test Script: ${testAPIs}`);
  console.log(`   (These are the main APIs being tested)`);
}

console.log('\n');

