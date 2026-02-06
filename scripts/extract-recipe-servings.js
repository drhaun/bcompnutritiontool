#!/usr/bin/env node

/**
 * Extract recipe servings from CSV and generate SQL update statements
 * Usage: node scripts/extract-recipe-servings.js > scripts/update-servings.sql
 */

const fs = require('fs');
const path = require('path');

const csvPath = '/Users/drcodyhaun/Desktop/NutritionOS/ni_recipes_126.csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Split by lines (each line is a recipe)
const lines = csvContent.split('\n').filter(line => line.trim());

const results = [];

for (const line of lines) {
  // First field is the slug (before first comma)
  const slugMatch = line.match(/^([^,]+),/);
  if (!slugMatch) continue;
  const slug = slugMatch[1].trim();
  
  // Look for yield/servings patterns
  let servings = 1; // Default to 1 serving
  
  // Pattern: "Recipe yield:</strong> 6" or "Yield: </strong>6" or "Servings: </strong>4"
  const yieldMatch = line.match(/(Recipe yield|Yield|Servings)[:\s]*<\/strong>\s*(\d+)/i);
  if (yieldMatch) {
    servings = parseInt(yieldMatch[2], 10);
  } else {
    // Try alternate pattern: "Yield</strong>: 6"
    const altYieldMatch = line.match(/(Yield|Servings)<\/strong>[:\s]*(\d+)/i);
    if (altYieldMatch) {
      servings = parseInt(altYieldMatch[2], 10);
    }
  }
  
  // Also check for explicit serving mentions in nutrition data
  // Pattern: "1 Serving:" or "Per serving:" - these typically mean 1 serving
  // Pattern: "6 servings" or "makes 4 servings"
  if (servings === 1) {
    const multiServingMatch = line.match(/(?:makes|recipe makes|yields?)\s*(\d+)\s*(?:servings?|portions?)/i);
    if (multiServingMatch) {
      servings = parseInt(multiServingMatch[1], 10);
    }
  }
  
  // Detect single-serving recipes by looking for phrases
  const singleServingIndicators = [
    /1 burrito/i,
    /1 sandwich/i,
    /1 bowl/i,
    /per serving/i,
    /1 serving/i,
    /1 shake/i,
    /1 smoothie/i,
    /1 wrap/i,
    /1 salad/i,
  ];
  
  // If no explicit yield found and has single-serving indicator, keep as 1
  // Otherwise, try to estimate from protein amounts
  if (servings === 1 && !singleServingIndicators.some(p => p.test(line))) {
    // Look for bulk protein indicators
    const lbMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)\s+(?:chicken|beef|pork|turkey|salmon|fish)/i);
    if (lbMatch) {
      const lbs = parseFloat(lbMatch[1]);
      // Estimate 4 servings per pound
      servings = Math.max(1, Math.round(lbs * 4));
    }
  }
  
  results.push({ slug, servings });
}

// Generate SQL
console.log('-- Update recipe_servings for ni_recipes table');
console.log('-- Generated from ni_recipes_126.csv');
console.log('');
console.log('-- First, add the column if it doesn\'t exist');
console.log('ALTER TABLE ni_recipes ADD COLUMN IF NOT EXISTS recipe_servings INTEGER DEFAULT 1;');
console.log('');
console.log('-- Update each recipe with the correct servings');
console.log('');

for (const { slug, servings } of results) {
  console.log(`UPDATE ni_recipes SET recipe_servings = ${servings} WHERE slug = '${slug}';`);
}

console.log('');
console.log('-- Summary:');
const byServings = {};
for (const { servings } of results) {
  byServings[servings] = (byServings[servings] || 0) + 1;
}
for (const [s, count] of Object.entries(byServings).sort((a, b) => parseInt(a[0]) - parseInt(b[0]))) {
  console.log(`-- ${count} recipes with ${s} serving(s)`);
}
