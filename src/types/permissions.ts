export type Permission =
  // Contracts
  | "contracts.view"
  | "contracts.create"
  | "contracts.edit"
  | "contracts.delete"
  | "contracts.print"
  
  // Vehicles
  | "vehicles.view"
  | "vehicles.edit"
  | "vehicles.maintenance"
  
  // Clients
  | "clients.view"
  | "clients.create"
  | "clients.edit"
  | "clients.delete"
  
  // Payments
  | "payments.view"
  | "payments.create"
  | "payments.delete"
  
  // Fleet
  | "fleet.view"
  | "fleet.edit"
  
  // Reports
  | "reports.view"
  | "reports.export"
  
  // Settings
  | "settings.view"
  | "settings.edit"
  
  // Users
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"
  
  // Branches
  | "branches.view"
  | "branches.manage";

export type Role = "admin" | "manager" | "agent" | "viewer" | "sous-traitant";

export interface RolePermissions {
  role: Role;
  label: string;
  labelAr: string;
  permissions: Permission[];
}

export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: "admin",
    label: "Administrateur",
    labelAr: "مدير النظام",
    permissions: [
      "contracts.view", "contracts.create", "contracts.edit", "contracts.delete", "contracts.print",
      "vehicles.view", "vehicles.edit", "vehicles.maintenance",
      "clients.view", "clients.create", "clients.edit", "clients.delete",
      "payments.view", "payments.create", "payments.delete",
      "fleet.view", "fleet.edit",
      "reports.view", "reports.export",
      "settings.view", "settings.edit",
      "users.view", "users.create", "users.edit", "users.delete",
      "branches.view", "branches.manage",
    ],
  },
  {
    role: "manager",
    label: "Gérant",
    labelAr: "مدير",
    permissions: [
      "contracts.view", "contracts.create", "contracts.edit", "contracts.print",
      "vehicles.view", "vehicles.maintenance",
      "clients.view", "clients.create", "clients.edit",
      "payments.view", "payments.create",
      "fleet.view",
      "reports.view", "reports.export",
      "settings.view",
      "branches.view",
    ],
  },
  {
    role: "agent",
    label: "Agent",
    labelAr: "وكيل",
    permissions: [
      "contracts.view", "contracts.create", "contracts.edit", "contracts.print",
      "vehicles.view",
      "clients.view", "clients.create",
      "payments.view", "payments.create",
      "fleet.view",
    ],
  },
  {
    role: "viewer",
    label: "Observateur",
    labelAr: "مراقب",
    permissions: [
      "contracts.view",
      "vehicles.view",
      "clients.view",
      "payments.view",
      "fleet.view",
      "reports.view",
    ],
  },
  {
    role: "sous-traitant",
    label: "Sous-traitant",
    labelAr: "مقاول",
    permissions: [
      "contracts.view",
      "vehicles.view",
    ],
  },
];

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const roleConfig = ROLE_PERMISSIONS.find(r => r.role === userRole);
  return roleConfig?.permissions.includes(permission) ?? false;
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS.find(r => r.role === role)?.permissions ?? [];
}

export function getRoleLabel(role: Role, lang: "ar" | "fr" = "fr"): string {
  const roleConfig = ROLE_PERMISSIONS.find(r => r.role === role);
  if (!roleConfig) return role;
  return lang === "ar" ? roleConfig.labelAr : roleConfig.label;
}
