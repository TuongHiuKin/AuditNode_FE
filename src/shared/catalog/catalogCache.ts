type SharedCatalogInvalidator = () => void;

const invalidators = new Set<SharedCatalogInvalidator>();

export function registerSharedCatalogInvalidator(invalidator: SharedCatalogInvalidator) {
  invalidators.add(invalidator);
  return () => { invalidators.delete(invalidator); };
}

export function invalidateSharedCatalog() {
  invalidators.forEach((invalidate) => invalidate());
}
