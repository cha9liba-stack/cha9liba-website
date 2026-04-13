import { config } from "../lib/config";
import type { Client } from "../types";

const DB_URL = config.firebase.databaseUrl;

export interface LoyaltyLevel {
  id: string;
  name: string;
  nameAr: string;
  minPoints: number;
  discountPercent: number;
  color: string;
  benefits: string[];
  benefitsAr: string[];
}

export interface ClientPoints {
  clientId: string;
  clientName: string;
  cin: string;
  phone: string;
  points: number;
  totalRents: number;
  totalSpent: number;
  level: string;
  transactions: LoyaltyTransaction[];
  createdAt: number;
  updatedAt: number;
}

export interface LoyaltyTransaction {
  id: string;
  type: "earn" | "redeem" | "expire";
  points: number;
  contractId?: string;
  contractNumber?: string;
  description: string;
  descriptionAr: string;
  date: number;
}

export const LOYALTY_LEVELS: LoyaltyLevel[] = [
  {
    id: "bronze",
    name: "Bronze",
    nameAr: "برونزي",
    minPoints: 0,
    discountPercent: 0,
    color: "#CD7F32",
    benefits: ["Basic benefits"],
    benefitsAr: ["مزايا أساسية"],
  },
  {
    id: "silver",
    name: "Silver",
    nameAr: "فضي",
    minPoints: 500,
    discountPercent: 5,
    color: "#C0C0C0",
    benefits: ["5% discount on rentals", "Priority support"],
    benefitsAr: ["خصم 5% على الإيجارات", "دعم أولوي"],
  },
  {
    id: "gold",
    name: "Gold",
    nameAr: "ذهبي",
    minPoints: 1500,
    discountPercent: 10,
    color: "#FFD700",
    benefits: ["10% discount", "Free upgrade when available", "Priority support"],
    benefitsAr: ["خصم 10%", "ترقية مجانية عند التوفر", "دعم أولوي"],
  },
  {
    id: "platinum",
    name: "Platinum",
    nameAr: "بلاتيني",
    minPoints: 5000,
    discountPercent: 15,
    color: "#E5E4E2",
    benefits: ["15% discount", "Free upgrade always", "VIP support", "Free delivery"],
    benefitsAr: ["خصم 15%", "ترقية مجانية دائمة", "دعم VIP", "توصيل مجاني"],
  },
];

async function fetchClientPoints(): Promise<ClientPoints[]> {
  try {
    const res = await fetch(`${DB_URL}/loyalty_data.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Object.values(data);
  } catch {
    return [];
  }
}

async function saveClientPoints(clients: ClientPoints[]): Promise<void> {
  try {
    await fetch(`${DB_URL}/loyalty_data.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clients),
    });
  } catch (e) {
    console.warn("[LoyaltyService] Failed to sync to Firebase", e);
  }
}

export async function getClientPoints(clientId: string): Promise<ClientPoints | null> {
  const data = await fetchClientPoints();
  return data.find(c => c.clientId === clientId) || null;
}

export async function getAllClientPoints(): Promise<ClientPoints[]> {
  return await fetchClientPoints();
}

export async function getOrCreateClientPoints(
  clientId: string,
  clientName: string,
  cin: string,
  phone: string
): Promise<ClientPoints> {
  let client = await getClientPoints(clientId);
  
  if (!client) {
    client = {
      clientId,
      clientName,
      cin,
      phone,
      points: 0,
      totalRents: 0,
      totalSpent: 0,
      level: "bronze",
      transactions: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    const allClients = await fetchClientPoints();
    allClients.push(client);
    await saveClientPoints(allClients);
  }
  
  return client;
}

export async function addPoints(
  clientId: string,
  clientName: string,
  cin: string,
  phone: string,
  contractId: string,
  contractNumber: string,
  amount: number
): Promise<ClientPoints> {
  const POINTS_PER_10_TND = 1;
  
  const client = await getOrCreateClientPoints(clientId, clientName, cin, phone);
  const pointsEarned = Math.floor(amount / 10) * POINTS_PER_10_TND;
  
  client.points += pointsEarned;
  client.totalRents += 1;
  client.totalSpent += amount;
  client.level = calculateLevel(client.points);
  client.updatedAt = Date.now();
  
  client.transactions.push({
    id: Date.now().toString(36),
    type: "earn",
    points: pointsEarned,
    contractId,
    contractNumber,
    description: `Location contrat #${contractNumber}`,
    descriptionAr: `إيجار عقد #${contractNumber}`,
    date: Date.now(),
  });
  
  const allClients = await fetchClientPoints();
  const index = allClients.findIndex(c => c.clientId === clientId);
  if (index >= 0) {
    allClients[index] = client;
  } else {
    allClients.push(client);
  }
  await saveClientPoints(allClients);
  
  return client;
}

export async function redeemPoints(
  clientId: string,
  points: number,
  description: string,
  descriptionAr: string
): Promise<ClientPoints | null> {
  const client = await getClientPoints(clientId);
  if (!client || client.points < points) return null;
  
  client.points -= points;
  client.level = calculateLevel(client.points);
  client.updatedAt = Date.now();
  
  client.transactions.push({
    id: Date.now().toString(36),
    type: "redeem",
    points: -points,
    description,
    descriptionAr,
    date: Date.now(),
  });
  
  const allClients = await fetchClientPoints();
  const index = allClients.findIndex(c => c.clientId === clientId);
  if (index >= 0) {
    allClients[index] = client;
    await saveClientPoints(allClients);
  }
  
  return client;
}

export function calculateLevel(points: number): string {
  let level = "bronze";
  
  for (const l of LOYALTY_LEVELS) {
    if (points >= l.minPoints) {
      level = l.id;
    } else {
      break;
    }
  }
  
  return level;
}

export function getLevelInfo(levelId: string): LoyaltyLevel | undefined {
  return LOYALTY_LEVELS.find(l => l.id === levelId);
}

export function getNextLevel(currentLevelId: string): LoyaltyLevel | null {
  const currentIndex = LOYALTY_LEVELS.findIndex(l => l.id === currentLevelId);
  if (currentIndex < LOYALTY_LEVELS.length - 1) {
    return LOYALTY_LEVELS[currentIndex + 1];
  }
  return null;
}

export function getPointsToNextLevel(points: number): number {
  const currentLevel = calculateLevel(points);
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) return 0;
  return nextLevel.minPoints - points;
}

export async function getDiscountForClient(clientId: string): Promise<number> {
  const client = await getClientPoints(clientId);
  if (!client) return 0;
  
  const level = getLevelInfo(client.level);
  return level?.discountPercent || 0;
}

export async function getTopClients(limit = 10): Promise<ClientPoints[]> {
  const allClients = await fetchClientPoints();
  return allClients
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function searchClients(query: string): Promise<ClientPoints[]> {
  const q = query.toLowerCase();
  const allClients = await fetchClientPoints();
  return allClients.filter(c => 
    c.clientName.toLowerCase().includes(q) ||
    c.cin.toLowerCase().includes(q) ||
    c.phone.includes(q)
  );
}

export async function linkLoyaltyToClient(client: Client, totalSpent: number): Promise<ClientPoints> {
  return await getOrCreateClientPoints(
    client.id,
    client.name,
    client.cin,
    client.phone
  );
}
