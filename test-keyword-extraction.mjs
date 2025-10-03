import { legalAPIService } from './src/services/LegalAPIService.js';

async function testKeywordExtraction() {
  console.log('Testing keyword extraction on: "Can I be fired for being pregnant?"\n');

  const keywords = await legalAPIService.extractKeywords('Can I be fired for being pregnant?');

  console.log('Extracted Keywords:');
  console.log('  All Keywords:', keywords.all);
  console.log('  Legal Terms:', keywords.legal);
  console.log('  General Terms:', keywords.general);
  console.log('\nTest PASSED: Keywords successfully extracted from pregnancy discrimination question');
}

testKeywordExtraction().catch(console.error);
