import type { User } from "../types";

export function isSousTraitant(user: User | null): boolean {
  return user?.role === "sous-traitant";
}

export function isAdmin(user: User | null): boolean {
  return user?.role === "admin";
}

export function canSeeAllContracts(user: User | null): boolean {
  return !isSousTraitant(user);
}

export function canEditContract(user: User | null): boolean {
  return !isSousTraitant(user);
}

export function canDeleteContract(user: User | null): boolean {
  return !isSousTraitant(user);
}

export function canAccessPage(user: User | null, page: string): boolean {
  if (!isSousTraitant(user)) return true;
  // Sous-traitant can only access: contracts, fleet
  const allowed = ["contracts", "fleet"];
  return allowed.includes(page);
}
