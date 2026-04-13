import { config } from "../lib/config";

const DB_URL = config.firebase.databaseUrl;

export interface PricingRule {
  id: string;
  name: string;
  nameAr: string;
  type: "weekend" | "holiday" | "season" | "long_term" | "loyalty" | "category";
  modifier: number;
  minDays?: number;
  maxDays?: number;
  startDate?: string;
  endDate?: string;
  categories?: string[];
  active: boolean;
  priority: number;
}

export interface PricingConfig {
  baseMultiplier: number;
  minimumPrice: number;
  currency: string;
  rules: PricingRule[];
}

async function fetchPricingConfig(): Promise<PricingConfig | null> {
  try {
    const res = await fetch(`${DB_URL}/pricing_config.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function savePricingConfigToFirebase(cfg: PricingConfig): Promise<void> {
  try {
    await fetch(`${DB_URL}/pricing_config.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
  } catch (e) {
    console.warn("[PricingService] Failed to sync to Firebase", e);
  }
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const stored = await fetchPricingConfig();
  if (stored) {
    return stored;
  }
  return getDefaultPricingConfig();
}

export async function savePricingConfig(cfg: PricingConfig): Promise<void> {
  localStorage.setItem("palma_pricing_config", JSON.stringify(cfg));
  await savePricingConfigToFirebase(cfg);
}

export function getDefaultPricingConfig(): PricingConfig {
  return {
    baseMultiplier: 1,
    minimumPrice: 50,
    currency: "TND",
    rules: [
      {
        id: "weekend",
        name: "Weekend Surcharge",
        nameAr: "زيادة نهاية الأسبوع",
        type: "weekend",
        modifier: 1.15,
        active: true,
        priority: 10,
      },
      {
        id: "holiday",
        name: "Holiday Surcharge",
        nameAr: "زيادة الأعياد",
        type: "holiday",
        modifier: 1.30,
        active: true,
        priority: 20,
      },
      {
        id: "long_term_week",
        name: "Weekly Discount",
        nameAr: "خصم الأسبوع",
        type: "long_term",
        modifier: 0.90,
        minDays: 7,
        active: true,
        priority: 5,
      },
      {
        id: "long_term_month",
        name: "Monthly Discount",
        nameAr: "خصم الشهر",
        type: "long_term",
        modifier: 0.75,
        minDays: 30,
        active: true,
        priority: 6,
      },
    ],
  };
}

export async function calculatePrice(
  basePrice: number,
  options: {
    days: number;
    startDate?: string;
    endDate?: string;
    category?: string;
    clientLoyaltyLevel?: number;
  }
): Promise<{
  originalPrice: number;
  finalPrice: number;
  appliedRules: PricingRule[];
  savings: number;
}> {
  const cfg = await getPricingConfig();
  const appliedRules: PricingRule[] = [];
  let price = basePrice * options.days;
  const originalPrice = price;
  
  for (const rule of cfg.rules) {
    if (!rule.active) continue;
    
    let applies = false;
    
    switch (rule.type) {
      case "weekend":
        if (options.startDate) {
          const start = new Date(options.startDate);
          const day = start.getDay();
          applies = day === 5 || day === 6;
        }
        break;
        
      case "holiday":
        if (options.startDate) {
          const start = new Date(options.startDate);
          if (rule.startDate && rule.endDate) {
            const holidayStart = new Date(rule.startDate);
            const holidayEnd = new Date(rule.endDate);
            applies = start >= holidayStart && start <= holidayEnd;
          }
        }
        break;
        
      case "season":
        if (options.startDate) {
          const start = new Date(options.startDate);
          if (rule.startDate && rule.endDate) {
            const seasonStart = new Date(rule.startDate);
            const seasonEnd = new Date(rule.endDate);
            applies = start >= seasonStart && start <= seasonEnd;
          }
        }
        break;
        
      case "long_term":
        if (rule.minDays && options.days >= rule.minDays) {
          if (rule.maxDays) {
            applies = options.days <= rule.maxDays;
          } else {
            applies = true;
          }
        }
        break;
        
      case "loyalty":
        if (rule.minDays && options.days >= rule.minDays) {
          applies = true;
        }
        break;
        
      case "category":
        if (rule.categories && options.category) {
          applies = rule.categories.includes(options.category);
        }
        break;
    }
    
    if (applies) {
      price *= rule.modifier;
      appliedRules.push(rule);
    }
  }
  
  const finalPrice = Math.max(price, cfg.minimumPrice);
  const savings = originalPrice - finalPrice;
  
  return {
    originalPrice,
    finalPrice,
    appliedRules,
    savings: Math.max(0, savings),
  };
}

export function getTunisianHolidays(year: number): { date: string; name: string; nameAr: string }[] {
  return [
    { date: `${year}-01-01`, name: "New Year's Day", nameAr: "رأس السنة" },
    { date: `${year}-01-14`, name: "Revolution Day", nameAr: "عيد الثورة" },
    { date: `${year}-03-20`, name: "Independence Day", nameAr: "عيد الاستقلال" },
    { date: `${year}-04-09`, name: "Martyrs' Day", nameAr: "يوم الشهداء" },
    { date: `${year}-05-01`, name: "Labor Day", nameAr: "يوم العمال" },
    { date: `${year}-07-25`, name: "Republic Day", nameAr: "عيد الجمهورية" },
    { date: `${year}-08-13`, name: "Women's Day", nameAr: "عيد المرأة" },
    { date: `${year}-09-15`, name: "Islamic New Year", nameAr: "رأس السنة الهجرية" },
    { date: `${year}-10-15`, name: "Moveable Day", nameAr: "عيد evacu" },
    { date: `${year}-11-15`, name: "President's Day", nameAr: "عيد الجلوس" },
    { date: `${year}-12-25`, name: "Christmas", nameAr: "عيد الميلاد" },
  ];
}

export async function addPricingRule(rule: Omit<PricingRule, "id">): Promise<PricingRule> {
  const cfg = await getPricingConfig();
  const newRule: PricingRule = {
    ...rule,
    id: Date.now().toString(36),
  };
  cfg.rules.push(newRule);
  cfg.rules.sort((a, b) => b.priority - a.priority);
  await savePricingConfig(cfg);
  return newRule;
}

export async function updatePricingRule(id: string, updates: Partial<PricingRule>): Promise<PricingRule | null> {
  const cfg = await getPricingConfig();
  const index = cfg.rules.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  cfg.rules[index] = { ...cfg.rules[index], ...updates };
  cfg.rules.sort((a, b) => b.priority - a.priority);
  await savePricingConfig(cfg);
  return cfg.rules[index];
}

export async function deletePricingRule(id: string): Promise<boolean> {
  const cfg = await getPricingConfig();
  const index = cfg.rules.findIndex(r => r.id === id);
  if (index === -1) return false;
  
  cfg.rules.splice(index, 1);
  await savePricingConfig(cfg);
  return true;
}
