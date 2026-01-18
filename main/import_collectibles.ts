import { prisma } from './lib/prisma.js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse a Python list string representation to an array
 * Example: "['Messenger', 'Grand Display']" -> ['Messenger', 'Grand Display']
 * Handles escaped quotes and complex strings
 */
function parsePythonList(listString: string): string[] {
  if (!listString || listString.trim() === '[]' || listString.trim() === '') {
    return [];
  }
  
  try {
    let cleaned = listString.trim();
    
    // Remove outer brackets if present
    if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
      cleaned = cleaned.slice(1, -1).trim();
    }
    
    // Remove outer double quotes if CSV parser added them
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    
    if (!cleaned) {
      return [];
    }
    
    // Use a state machine to parse items between single quotes
    const items: string[] = [];
    let current = '';
    let inSingleQuotes = false;
    let i = 0;
    
    while (i < cleaned.length) {
      const char = cleaned[i];
      const nextChar = cleaned[i + 1];
      
      if (!inSingleQuotes) {
        // Looking for opening single quote
        if (char === "'") {
          inSingleQuotes = true;
          current = '';
        }
        // Skip whitespace, commas, and other chars outside quotes
      } else {
        // Inside single quotes
        if (char === "'") {
          // Check if it's an escaped quote (double single quote) or closing quote
          if (nextChar === "'") {
            // Escaped quote - add one quote to current and skip next
            current += "'";
            i++; // Skip next quote
          } else {
            // Closing quote - save the item
            items.push(current);
            current = '';
            inSingleQuotes = false;
            // Skip whitespace and comma after closing quote
            i++; // Move past closing quote
            while (i < cleaned.length && (cleaned[i] === ' ' || cleaned[i] === ',')) {
              i++;
            }
            i--; // Adjust for loop increment
          }
        } else {
          // Regular character inside quotes
          current += char;
        }
      }
      i++;
    }
    
    // Handle case where string ends without closing quote
    if (inSingleQuotes && current) {
      items.push(current);
    }
    
    return items.filter(item => item.trim().length > 0);
  } catch (error) {
    console.error(`Error parsing list string: ${listString.substring(0, 100)}...`, error);
    return [];
  }
}

async function main() {
  console.log('Starting collectible import...');
  
  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'scraper', 'test.csv');
  console.log(`Reading CSV from: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true
  });
  
  console.log(`Found ${records.length} rows in CSV`);
  
  let totalInserted = 0;
  let totalSkipped = 0;
  let seriesNotFound: string[] = [];
  
  // Process each row
  for (const record of records as Array<{ series_title?: string; collection_names?: string }>) {
    const seriesTitle = record.series_title?.trim();
    const collectionNamesStr = record.collection_names?.trim() || '';
    
    if (!seriesTitle) {
      console.log(`Skipping row: missing series_title`);
      totalSkipped++;
      continue;
    }
    
    // Parse collection names
    const collectionNames = parsePythonList(collectionNamesStr);
    
    if (collectionNames.length === 0) {
      console.log(`Skipping ${seriesTitle}: no collection names`);
      totalSkipped++;
      continue;
    }
    
    // Find matching series (case-insensitive exact match)
    // First try exact match for performance
    let series = await prisma.series.findFirst({
      where: {
        name: seriesTitle
      }
    });
    
    // If not found, try case-insensitive exact match using raw query
    if (!series) {
      const result = await prisma.$queryRaw<Array<{ id: number; name: string }>>`
        SELECT id, name FROM "Series" WHERE LOWER(name) = LOWER(${seriesTitle}) LIMIT 1
      `;
      if (result.length > 0) {
        series = await prisma.series.findUnique({
          where: { id: result[0].id }
        });
      }
    }
    
    if (!series) {
      console.log(`Series not found: "${seriesTitle}"`);
      seriesNotFound.push(seriesTitle);
      totalSkipped++;
      continue;
    }
    
    console.log(`\nProcessing series: ${series.name} (ID: ${series.id})`);
    console.log(`  Found ${collectionNames.length} collectibles`);
    
    // Insert each collectible
    for (const collectibleName of collectionNames) {
      if (!collectibleName || collectibleName.trim() === '') {
        continue;
      }
      
      try {
        // Check if collectible already exists
        const existing = await prisma.collectible.findFirst({
          where: {
            name: collectibleName.trim(),
            seriesId: series.id
          }
        });
        
        if (existing) {
          console.log(`  - Skipping "${collectibleName}" (already exists)`);
          continue;
        }
        
        // Insert new collectible with default values
        await prisma.collectible.create({
          data: {
            name: collectibleName.trim(),
            rarity: 'Common', // Default rarity
            referenceValue: 15.0, // Default reference value
            seriesId: series.id
          }
        });
        
        console.log(`  [OK] Inserted: "${collectibleName}"`);
        totalInserted++;
      } catch (error: any) {
        console.error(`  [ERROR] Error inserting "${collectibleName}":`, error.message);
      }
    }
  }
  
  console.log('\n=== Import Summary ===');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped: ${totalSkipped}`);
  
  if (seriesNotFound.length > 0) {
    console.log(`\nSeries not found in database:`);
    seriesNotFound.forEach(name => console.log(`  - ${name}`));
    console.log(`\nPlease ensure these series exist in the Series table before importing their collectibles.`);
  }
  
  console.log('\nImport completed!');
}

main()
  .catch((e) => {
    console.error('Error during import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
