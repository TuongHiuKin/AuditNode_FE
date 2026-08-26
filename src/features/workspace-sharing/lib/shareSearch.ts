export const SHARE_DIRECTORY_MIN_SEARCH_LENGTH = 3;

export function normalizeShareDirectorySearch(value: string): string {
  return value.trim().slice(0, 100);
}

export function canSearchShareDirectory(value: string): boolean {
  return normalizeShareDirectorySearch(value).length >= SHARE_DIRECTORY_MIN_SEARCH_LENGTH;
}

export function effectiveShareOptionsSearch(value: string): string {
  const normalized = normalizeShareDirectorySearch(value);
  return normalized.length >= SHARE_DIRECTORY_MIN_SEARCH_LENGTH ? normalized : "";
}
