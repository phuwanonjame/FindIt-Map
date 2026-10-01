import { Smartphone, Wallet, Briefcase, Key, FileText, CreditCard, PawPrint, Gem, Laptop, Package } from "lucide-react";

export const CATEGORY_ICONS = {
  phone: Smartphone,
  wallet: Wallet,
  bag: Briefcase,
  key: Key,
  document: FileText,
  card: CreditCard,
  pet: PawPrint,
  jewelry: Gem,
  electronics: Laptop,
  other: Package,
};

export function CategoryIcon({ id, className }) {
  const Icon = CATEGORY_ICONS[id] || Package;
  return <Icon className={className} />;
}