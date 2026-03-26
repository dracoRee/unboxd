const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'unboxed-web-app/src/app/services/trade.service.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Inside mapToTradeItem, we need to map vouchCount
const mapToTradeItemRegex = /const mappedItem: TradeItem = {[\s\S]*?};/g;

const match = content.match(mapToTradeItemRegex);
if (match) {
  let mappedItemCode = match[0];
  if (!mappedItemCode.includes('vouchCount')) {
    mappedItemCode = mappedItemCode.replace(
      /isFavourited: this.wishlistedIds.has\(listingId\),/g,
      "isFavourited: this.wishlistedIds.has(listingId),\n      vouchCount: parseInt(item.vouchCount) || 0,\n      hasVouched: false, // Server needs to return this or we fetch it"
    );
    content = content.replace(match[0], mappedItemCode);
    
    fs.writeFileSync(filePath, content);
    console.log('patched trade.service.ts');
  } else {
    console.log('vouchCount already in trade.service.ts');
  }
} else {
  console.log('mapToTradeItem regex did not match');
}
