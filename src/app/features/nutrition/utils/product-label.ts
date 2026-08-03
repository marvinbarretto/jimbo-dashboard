/**
 * Human-readable name for a scanned product.
 *
 * Open Food Facts stores brand and name independently and they overlap
 * constantly — its Snickers entry is brand "Snickers", name "Snickers", and its
 * Coca-Cola entry is brand "Coca-Cola", name "coca-cola". Concatenating blindly
 * gives "Snickers — Snickers". Mirrors the rule jimbo-api applies when it
 * builds the label it actually logs, so the confirm screen and the log agree.
 */
export function productDisplayName(brand: string | null, label: string): string {
  if (!brand) return label;
  return label.toLowerCase().startsWith(brand.toLowerCase()) ? label : `${brand} — ${label}`;
}
