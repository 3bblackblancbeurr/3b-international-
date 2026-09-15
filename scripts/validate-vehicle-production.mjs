import {GOLD_MASTER_COUNTRY_ORDER,goldMastersForCountry,vehicleProductionCatalogReport} from '../src/games/underground/productionCatalog.js';
const report=vehicleProductionCatalogReport();
if(!report.ok){
  console.error('Vehicle production catalogue invalid',report.errors);
  process.exit(1);
}
console.log(`Vehicle production catalogue OK: ${report.total} Gold Masters`);
for(const countryId of GOLD_MASTER_COUNTRY_ORDER)console.log(`${countryId}: ${goldMastersForCountry(countryId).length}`);
