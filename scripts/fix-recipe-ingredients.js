/**
 * Script to extract ingredients and directions from CSV and update the database
 * Run with: node scripts/fix-recipe-ingredients.js
 */

const fs = require('fs');
const path = require('path');

const csvPath = '/Users/drcodyhaun/Desktop/NutritionOS/ni_recipes_126.csv';
const outputPath = path.join(__dirname, 'fix-ingredients.sql');

// Read the CSV file
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Extract ingredients from HTML
function extractIngredients(html) {
  const ingredients = [];
  
  // Find the ingredients section - handle various HTML formats
  // Formats: <h2>Ingredients:</h2>, <h3><strong>Ingredients:</strong></h3>, etc.
  const ingMatch = html.match(/Ingredients:?(?:<\/strong>)?<\/h[23]>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ingMatch) {
    // Try alternate format without heading
    const altMatch = html.match(/<ul[^>]*data-rte-list[^>]*>([\s\S]*?)<\/ul>/i);
    if (!altMatch) return [];
    // Use first ul found
    const ulContent = altMatch[1];
    return parseListItems(ulContent);
  }
  
  return parseListItems(ingMatch[1]);
}

// Parse list items from ul content
function parseListItems(ulContent) {
  const items = [];
  
  // Extract each <li> item - handle various formats
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  
  while ((match = liRegex.exec(ulContent)) !== null) {
    // Clean up the text - remove all HTML tags
    let text = match[1]
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text && text.length > 1) {
      // Parse into item and amount
      const parsed = parseIngredient(text);
      items.push(parsed);
    }
  }
  
  return items;
}

// Parse a single ingredient string into item and amount
function parseIngredient(text) {
  // Common patterns: "1 cup milk", "2 tbsp olive oil", "1/2 tsp salt"
  const amountRegex = /^([\d\/\.\s½¼¾⅓⅔]+\s*(?:cup|cups|tbsp|tsp|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|ml|clove|cloves|can|cans|slice|slices|piece|pieces|medium|large|small|bunch|sprig|sprigs|dash|dashes|pinch|packet|packets|scoop|scoops)?\s*(?:of\s+)?)/i;
  
  const match = text.match(amountRegex);
  
  if (match && match[1].trim()) {
    const amount = match[1].trim();
    const item = text.slice(match[0].length).trim();
    return { item: item || text, amount: amount };
  }
  
  return { item: text, amount: '1' };
}

// Extract directions from HTML
function extractDirections(html) {
  const directions = [];
  
  // Find the directions section - handle various formats
  const dirMatch = html.match(/Directions:?(?:<\/strong>)?<\/h[23]>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (!dirMatch) return [];
  
  const olContent = dirMatch[1];
  
  // Extract each <li> item
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match;
  
  while ((match = liRegex.exec(olContent)) !== null) {
    // Clean up the text - remove all HTML tags
    let text = match[1]
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&deg;/g, '°')
      .replace(/℉/g, '°F')
      .replace(/℃/g, '°C')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (text && text.length > 2) {
      directions.push(text);
    }
  }
  
  return directions;
}

// Escape string for SQL
function escapeSql(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/'/g, "''");
}

// Process the CSV
const lines = csvContent.split('\n').filter(line => line.trim());
const sqlStatements = [];

console.log(`Processing ${lines.length} recipes...`);

let successCount = 0;
let failCount = 0;

for (const line of lines) {
  const columns = parseCSVLine(line);
  if (columns.length < 3) continue;
  
  const slug = columns[0].trim();
  const name = columns[1].trim();
  const htmlContent = columns[2];
  
  if (!slug || !htmlContent) continue;
  
  const ingredients = extractIngredients(htmlContent);
  const directions = extractDirections(htmlContent);
  
  if (ingredients.length === 0 && directions.length === 0) {
    console.log(`Warning: No data extracted for "${name}" (${slug})`);
    failCount++;
    continue;
  }
  
  // Create SQL update statement
  // Note: ingredients is jsonb, directions is text[]
  const ingredientsJson = JSON.stringify(ingredients);
  
  // Format directions as PostgreSQL text array
  const directionsArray = directions.map(d => `"${escapeSql(d).replace(/"/g, '\\"')}"`).join(',');
  
  const sql = `UPDATE ni_recipes SET 
  ingredients = '${escapeSql(ingredientsJson)}'::jsonb,
  directions = ARRAY[${directions.map(d => `'${escapeSql(d)}'`).join(',')}]::text[]
WHERE slug = '${escapeSql(slug)}';`;
  
  sqlStatements.push(sql);
  successCount++;
  
  console.log(`✓ ${name}: ${ingredients.length} ingredients, ${directions.length} directions`);
}

// Write SQL file
const sqlContent = `-- Fix recipe ingredients and directions
-- Generated on ${new Date().toISOString()}
-- Total recipes: ${sqlStatements.length}

${sqlStatements.join('\n\n')}
`;

fs.writeFileSync(outputPath, sqlContent);

console.log(`\n=== Summary ===`);
console.log(`Successfully processed: ${successCount}`);
console.log(`Failed/skipped: ${failCount}`);
console.log(`SQL file written to: ${outputPath}`);
console.log(`\nRun this SQL in your Supabase dashboard to update the database.`);
