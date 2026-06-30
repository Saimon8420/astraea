// Type shim for tz-lookup, which ships without its own declarations.

declare module "tz-lookup" {
  /**
   * Returns the IANA timezone name (e.g. "Asia/Dhaka") for a coordinate.
   * Throws if latitude/longitude are out of range.
   */
  export default function tzlookup(latitude: number, longitude: number): string;
}
