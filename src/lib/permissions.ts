import type { User } from "../types";

const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

// Cache for role permissions
let rolePermissionsCache: Record<string, string[]> = {};
let permissionsLoaded = false;

export function fetchRolePermissions(): void {
  if (permissionsLoaded) return;

  fetch(`${DB_URL}/role_permissions.json`)
    .then(res => res.json())
    .then(data => {
      rolePermissionsCache = data || {};
      permissionsLoaded = true;
    })
    .catch(() => {
      rolePermissionsCache = {};
      permissionsLoaded = true;
    });
}

function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  
  // Load permissions if not loaded yet
  if (!permissionsLoaded) {
    fetchRolePermissions();
    // Default to deny until permissions are loaded
    return false;
  }
  
  const rolePerms = rolePermissionsCache[user.role] || [];
  return rolePerms.includes(permission);
}

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
  if (isAdmin(user)) return true;
  const hasPerm = hasPermission(user, "edit_contracts");
  console.log("[Permissions] canEditContract:", { user: user?.username, role: user?.role, hasPerm, permissionsLoaded });
  return hasPerm;
}

export function canDeleteContract(user: User | null): boolean {
  if (isAdmin(user)) return true;
  return hasPermission(user, "delete_contracts");
}

export function canAccessPage(user: User | null, page: string): boolean {
  if (!isSousTraitant(user)) return true;
  // Sous-traitant can only access: contracts, fleet
  const allowed = ["contracts", "fleet"];
  return allowed.includes(page);
}
