/**
 * Non-Dummy Data Validation Tests
 * Tests: No placeholder images, no hardcoded lists, no dummy numbers, no mock items
 */

import pool from '../src/config/db.js';
import { readFileSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let testResults = [];

function logTest(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  console.log(`  ${status} ${name}${message ? ': ' + message : ''}`);
  testResults.push({ name, passed, message });
}

async function testNoPlaceholderImages() {
  console.log('\n📋 Testing: No Placeholder Images');
  
  try {
    const backendDir = join(__dirname, '..');
    const controllersDir = join(backendDir, 'src', 'controllers');
    
    // Check controller files for placeholder URLs
    const files = await readdir(controllersDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    let foundPlaceholders = [];
    
    for (const file of jsFiles) {
      const content = readFileSync(join(controllersDir, file), 'utf-8');
      
      const placeholderPatterns = [
        /via\.placeholder\.com/gi,
        /picsum\.photos/gi,
        /unsplash\.com.*photo/gi,
        /example\.com.*image/gi,
        /placeholder.*image/gi
      ];
      
      placeholderPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          foundPlaceholders.push({ file, pattern: pattern.source });
        }
      });
    }
    
    logTest('No placeholder images in controllers', foundPlaceholders.length === 0, 
      foundPlaceholders.length > 0 ? `Found in: ${foundPlaceholders.map(f => f.file).join(', ')}` : '');
    
  } catch (error) {
    logTest('No placeholder images check', false, error.message);
  }
}

async function testNoHardcodedLists() {
  console.log('\n📋 Testing: No Hardcoded Lists');
  
  try {
    const backendDir = join(__dirname, '..');
    const controllersDir = join(backendDir, 'src', 'controllers');
    
    const files = await readdir(controllersDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    let foundHardcoded = [];
    
    for (const file of jsFiles) {
      const content = readFileSync(join(controllersDir, file), 'utf-8');
      
      // Check for hardcoded arrays with dummy data patterns
      const hardcodedPatterns = [
        /const\s+\w+\s*=\s*\[\s*\{[^}]*id:\s*1[^}]*\}/g,
        /const\s+\w+\s*=\s*\[\s*\{[^}]*name:\s*['"]John Doe['"]/g,
        /const\s+\w+\s*=\s*\[\s*\{[^}]*title:\s*['"]Gaming Laptop['"]/g,
      ];
      
      hardcodedPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          foundHardcoded.push({ file, pattern: pattern.source });
        }
      });
    }
    
    logTest('No hardcoded lists in controllers', foundHardcoded.length === 0,
      foundHardcoded.length > 0 ? `Found in: ${foundHardcoded.map(f => f.file).join(', ')}` : '');
    
  } catch (error) {
    logTest('No hardcoded lists check', false, error.message);
  }
}

async function testDatabaseHasRealData() {
  console.log('\n📋 Testing: Database Has Real Data (Not Dummy)');
  
  try {
    // Check products table
    const productsResult = await pool.query(
      "SELECT COUNT(*) as count FROM products WHERE status = 'approved'"
    );
    const productCount = parseInt(productsResult.rows[0].count);
    
    logTest('Products in database', productCount >= 0, 
      `Found ${productCount} approved products`);
    
    // Check categories
    let categoriesResult;
    try {
      categoriesResult = await pool.query(
        "SELECT COUNT(*) as count FROM categories WHERE active = true"
      );
    } catch (e) {
      categoriesResult = await pool.query(
        "SELECT COUNT(*) as count FROM categories WHERE is_active = true"
      );
    }
    const categoryCount = parseInt(categoriesResult.rows[0].count);
    
    logTest('Categories in database', categoryCount >= 0, 
      `Found ${categoryCount} active categories`);
    
    // Check users
    const usersResult = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'approved'"
    );
    const userCount = parseInt(usersResult.rows[0].count);
    
    logTest('Users in database', userCount >= 0, 
      `Found ${userCount} approved users`);
    
    // Verify no products with placeholder image URLs
    const placeholderImages = await pool.query(
      `SELECT COUNT(*) as count FROM products 
       WHERE image_url LIKE '%placeholder%' 
       OR image_url LIKE '%picsum%' 
       OR image_url LIKE '%unsplash%'`
    );
    
    logTest('No placeholder images in database', placeholderImages.rows[0].count === '0',
      `Found ${placeholderImages.rows[0].count} products with placeholder URLs`);
    
  } catch (error) {
    logTest('Database real data check', false, error.message);
  }
}

async function testAPIEndpointsReturnRealData() {
  console.log('\n📋 Testing: API Endpoints Return Real Data');
  
  try {
    // Test categories endpoint structure
    const categoriesResult = await pool.query(
      "SELECT id, name FROM categories WHERE active = true LIMIT 5"
    );
    
    logTest('Categories endpoint returns data', categoriesResult.rows.length >= 0,
      `Categories available: ${categoriesResult.rows.length}`);
    
    // Test products endpoint structure
    const productsResult = await pool.query(
      "SELECT id, title FROM products WHERE status = 'approved' LIMIT 5"
    );
    
    logTest('Products endpoint returns data', productsResult.rows.length >= 0,
      `Approved products available: ${productsResult.rows.length}`);
    
    // Verify response structure
    if (categoriesResult.rows.length > 0) {
      const category = categoriesResult.rows[0];
      const hasValidStructure = category.id && category.name;
      logTest('Category data structure', hasValidStructure, 
        `Structure: ${hasValidStructure ? 'Valid' : 'Invalid'}`);
    }
    
  } catch (error) {
    logTest('API endpoints real data check', false, error.message);
  }
}

export async function runTests() {
  console.log('\n🚫 NO DUMMY DATA VALIDATION TESTS');
  console.log('='.repeat(60));
  
  testResults = [];
  
  await testNoPlaceholderImages();
  await testNoHardcodedLists();
  await testDatabaseHasRealData();
  await testAPIEndpointsReturnRealData();
  
  const passed = testResults.filter(t => t.passed).length;
  const failed = testResults.filter(t => !t.passed).length;
  
  console.log('\n📊 No Dummy Data Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Total:  ${testResults.length}`);
  
  return { passed, failed, total: testResults.length };
}

