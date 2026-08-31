export type CatalogView = "mine" | "shared";
export type EffectivePermission = "owner" | "editor" | "viewer";

export interface CatalogCapabilities {
  canRead: boolean;
  canEditProperties: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canChangeLabels: boolean;
  canChangeOwner: boolean;
  canManageGrants: boolean;
}

export interface CatalogResourceAccess {
  ownerUserId: string;
  effectivePermission: EffectivePermission;
  sharedLabelIds: string[];
  capabilities: CatalogCapabilities;
}

export interface CatalogPage<T> {
  items: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface CatalogFilters {
  ownerUserId: string | null;
  labelKey: string | null;
  labelValue: string | null;
}

export interface CatalogLabel extends CatalogResourceAccess {
  id: string;
  key: string;
  value: string;
  kind: "owner" | "business";
  isProtected: boolean;
}

export type CatalogServer = Schemas["ServerResponseDto"] & CatalogResourceAccess;
export type CatalogApplication = Schemas["ApplicationResponseDto"] & CatalogResourceAccess;
export type CatalogDatacenter = Schemas["DatacenterDto"] & CatalogResourceAccess;

export const emptyCatalogFilters: CatalogFilters = {
  ownerUserId: null,
  labelKey: null,
  labelValue: null,
};
import type { Schemas } from "../api/client";
