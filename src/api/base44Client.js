// Temporary compatibility name for pages not yet renamed. It delegates only to
// the Supabase adapter; it contains no Base44 SDK or LocalStorage persistence.
export { base44, base44 as appClient } from "./supabaseAdapter";
