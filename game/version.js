// scripts/publish.sh imports every module as `./x.js?v=<commit>`; source files carry no version.
// Images and JSON are fetched through asset() so they pick up the same version and skip stale caches.
export const version = new URL(import.meta.url).searchParams.get('v');

export function asset(path, base) {
  const url = new URL(path, base);
  if (version) url.searchParams.set('v', version);
  return url;
}
