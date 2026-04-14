// Script to extract unique cars from contracts and add them to Firebase custom_cars
const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

// Palma Fleet cars (from RegistrationInput.tsx)
const PALMA_FLEET = {
  "7468TU245": { brand: "Kia",        model: "Stonic D",      category: "SUV" },
  "9192TU234": { brand: "Renault",    model: "Clio Bleu",     category: "Citadine" },
  "5605TU236": { brand: "Hyundai",    model: "I20 Noir",      category: "Citadine" },
  "5606TU236": { brand: "Hyundai",    model: "I20 Blanc",     category: "Citadine" },
  "8305TU238": { brand: "Kia",        model: "Rio",           category: "Citadine" },
  "4485TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "4486TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "2526TU242": { brand: "MG",         model: "ZS B",          category: "SUV" },
  "2532TU242": { brand: "MG",         model: "ZS G",          category: "SUV" },
  "1389TU244": { brand: "Seat",       model: "Ibiza",         category: "Citadine" },
  "1162TU245": { brand: "Renault",    model: "Clio Blanc",    category: "Citadine" },
  "2504TU246": { brand: "Hyundai",    model: "I20 G",         category: "Citadine" },
  "2508TU246": { brand: "Hyundai",    model: "I20 B",         category: "Citadine" },
  "4912TU246": { brand: "Kia",        model: "Stonic B",      category: "SUV" },
  "203TU248":  { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "201TU248":  { brand: "Seat",       model: "Ibiza B",       category: "Citadine" },
  "1958TU248": { brand: "Mahindra",   model: "XUV R",         category: "SUV" },
  "1959TU248": { brand: "Mahindra",   model: "KUV300 B",      category: "SUV" },
  "1945TU251": { brand: "Suzuki",     model: "Swift R",       category: "Citadine" },
  "5941TU251": { brand: "Renault",    model: "Clio Noir",     category: "Citadine" },
  "5943TU251": { brand: "Renault",    model: "Clio Gris C",   category: "Citadine" },
  "7138TU251": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "7057TU252": { brand: "Kia",        model: "Picanto",       category: "Citadine" },
  "9601TU252": { brand: "Skoda",      model: "Kushaq B",      category: "SUV" },
  "9603TU252": { brand: "Skoda",      model: "Kushaq Bleu",   category: "SUV" },
  "3541TU253": { brand: "Volkswagen", model: "Virtus Gris",   category: "Berline" },
  "7378TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7379TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7360TU255": { brand: "Citroen",    model: "Berlingo",      category: "Utilitaire" },
  "6155TU259": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
};

function normReg(s) {
  return s.replace(/\s+/g, "").toUpperCase();
}

function isPalmaCar(registration) {
  const normRegValue = normReg(registration);
  return PALMA_FLEET.hasOwnProperty(normRegValue);
}

async function main() {
  console.log("Fetching contracts from Firebase...");
  const contractsResponse = await fetch(`${DB}/contracts.json`);
  const contracts = await contractsResponse.json();
  
  if (!contracts) {
    console.log("No contracts found");
    return;
  }

  console.log(`Found ${Object.keys(contracts).length} contracts`);
  
  // Print sample contract structure
  const sampleContracts = Object.values(contracts).slice(0, 3);
  console.log("Sample contract structure:");
  console.log(JSON.stringify(sampleContracts[0], null, 2));

  // Extract unique cars from contracts
  const uniqueCars = {};
  let palmaCount = 0;
  let missingDataCount = 0;
  let hasRegistrationCount = 0;
  
  for (const [id, contract] of Object.entries(contracts)) {
    // Use both English and Arabic/French field names
    const registration = contract.registration || contract.Immatricule || contract["المتريكيل"];
    const brand = contract.brand || contract.Marque || contract["الماركة"];
    const model = contract.model || contract["Modèl"] || contract["الموديل"];
    const category = contract.category || contract["صنف السيارة"] || "Citadine";
    
    if (!registration) {
      missingDataCount++;
      continue;
    }
    
    hasRegistrationCount++;
    
    // Skip Palma cars
    if (isPalmaCar(registration)) {
      palmaCount++;
      continue;
    }
    
    const normRegValue = normReg(registration);
    
    // If this car already exists, keep the most recent data
    if (uniqueCars[normRegValue]) {
      const existing = uniqueCars[normRegValue];
      const existingDate = existing._updatedAt || existing._createdAt || 0;
      const contractDate = contract._updatedAt || contract._createdAt || 0;
      
      if (contractDate > existingDate) {
        uniqueCars[normRegValue] = {
          id: normRegValue,
          registration: registration,
          brand: brand || "",
          model: model || "",
          category: category || "Citadine",
          _createdAt: contract._createdAt || Date.now(),
          _updatedAt: contract._updatedAt || Date.now(),
        };
      }
    } else {
      uniqueCars[normRegValue] = {
        id: normRegValue,
        registration: registration,
        brand: brand || "",
        model: model || "",
        category: category || "Citadine",
        _createdAt: contract._createdAt || Date.now(),
        _updatedAt: contract._updatedAt || Date.now(),
      };
    }
  }

  console.log(`Has registration: ${hasRegistrationCount}`);
  console.log(`Palma cars: ${palmaCount}`);
  console.log(`Missing data: ${missingDataCount}`);
  console.log(`Found ${Object.keys(uniqueCars).length} unique custom cars from contracts`);
  
  if (Object.keys(uniqueCars).length > 0) {
    console.log("Sample custom cars:");
    const keys = Object.keys(uniqueCars).slice(0, 5);
    keys.forEach(key => {
      console.log(`  ${key}: ${uniqueCars[key].brand} ${uniqueCars[key].model}`);
    });
  }

  // Fetch existing custom_cars from Firebase
  console.log("Fetching existing custom_cars from Firebase...");
  const customCarsResponse = await fetch(`${DB}/custom_cars.json`);
  const existingCustomCars = await customCarsResponse.json() || {};
  
  console.log(`Found ${Object.keys(existingCustomCars).length} existing custom cars`);

  // Merge with existing custom_cars
  const mergedCars = { ...existingCustomCars };
  let addedCount = 0;
  let updatedCount = 0;

  for (const [reg, car] of Object.entries(uniqueCars)) {
    if (mergedCars[reg]) {
      // Update existing car
      mergedCars[reg] = {
        ...mergedCars[reg],
        brand: car.brand,
        model: car.model,
        category: car.category,
        _updatedAt: car._updatedAt,
      };
      updatedCount++;
    } else {
      // Add new car
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      mergedCars[newId] = car;
      addedCount++;
    }
  }

  console.log(`Added ${addedCount} new cars`);
  console.log(`Updated ${updatedCount} existing cars`);

  // Save to Firebase
  console.log("Saving to Firebase custom_cars...");
  await fetch(`${DB}/custom_cars.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mergedCars),
  });

  console.log("Done!");
  console.log(`Total custom cars in Firebase: ${Object.keys(mergedCars).length}`);
}

main().catch(console.error);
