// Shared constants for FindIt Map

export const CATEGORIES = [
  { id: "phone", name: "โทรศัพท์", icon: "Smartphone" },
  { id: "wallet", name: "กระเป๋าสตางค์", icon: "Wallet" },
  { id: "bag", name: "กระเป๋า", icon: "Briefcase" },
  { id: "key", name: "กุญแจ", icon: "Key" },
  { id: "document", name: "เอกสาร", icon: "FileText" },
  { id: "card", name: "บัตร", icon: "CreditCard" },
  { id: "pet", name: "สัตว์เลี้ยง", icon: "PawPrint" },
  { id: "jewelry", name: "เครื่องประดับ", icon: "Gem" },
  { id: "electronics", name: "อุปกรณ์อิเล็กทรอนิกส์", icon: "Laptop" },
  { id: "other", name: "อื่นๆ", icon: "Package" },
];

export const CATEGORY_MAP = CATEGORIES.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

export const LOST_STATUSES = {
  SEARCHING: { label: "กำลังตามหา", color: "lost" },
  POSSIBLE_MATCH: { label: "มีของที่อาจตรงกัน", color: "warning" },
  FOUND_BY_SOMEONE: { label: "มีคนแจ้งว่าเก็บได้", color: "warning" },
  ARRANGING_RETURN: { label: "กำลังนัดรับคืน", color: "primary" },
  RETURNED: { label: "ได้คืนแล้ว", color: "found" },
  CLOSED: { label: "ปิดประกาศ", color: "muted" },
};

export const FOUND_STATUSES = {
  WAITING_OWNER: { label: "รอเจ้าของ", color: "found" },
  CLAIM_REQUESTED: { label: "มีคนแจ้งว่าเป็นเจ้าของ", color: "warning" },
  VERIFICATION: { label: "กำลังตรวจสอบ", color: "warning" },
  ARRANGING_RETURN: { label: "นัดส่งคืน", color: "primary" },
  RETURNED: { label: "ส่งคืนแล้ว", color: "found" },
  HANDED_TO_LOCATION: { label: "ฝากไว้ที่จุดรับของ", color: "primary" },
  CLOSED: { label: "ปิดประกาศ", color: "muted" },
};

export function getStatusInfo(status, postType) {
  if (postType === "LOST") return LOST_STATUSES[status] || { label: status, color: "muted" };
  return FOUND_STATUSES[status] || { label: status, color: "muted" };
}

export const HOLDER_TYPES = {
  WITH_FINDER: { label: "เก็บไว้กับฉัน", icon: "User" },
  DEPOSITED: { label: "ฝากไว้กับสถานที่", icon: "Building2" },
  HANDED_TO_STAFF: { label: "ส่งให้เจ้าหน้าที่", icon: "Shield" },
  TAKEN_BY_OTHER: { label: "มีคนอื่นรับไป", icon: "UserMinus" },
};

export const LOCATION_PRIVACY = [
  { value: "EXACT", label: "ตำแหน่งแม่นยำ" },
  { value: "APPROX_100M", label: "ประมาณ 100 ม." },
  { value: "APPROX_300M", label: "ประมาณ 300 ม." },
  { value: "LANDMARK_ONLY", label: "เฉพาะจุดสังเกต" },
];

export const REPORT_REASONS = [
  "ประกาศหลอกลวง",
  "ประกาศปลอม",
  "ข้อมูลผิดพลาด",
  "รูปภาพไม่เหมาะสม",
  "เปิดเผยข้อมูลส่วนบุคคล",
  "คุกคาม",
  "สแปม",
  "อื่นๆ",
];

export const REVIEW_TAGS = ["ติดต่อเร็ว", "สุภาพ", "ช่วยเหลือดี", "ส่งคืนครบถ้วน"];

// Bangkok center
export const BANGKOK_CENTER = [13.7563, 100.5018];

// Haversine distance in meters
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} ม.`;
  return `${(meters / 1000).toFixed(1)} กม.`;
}

export function maskPhone(phone) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return phone.replace(/(\d{2})(\d+)(\d{4})/, (_, a, b, c) => a + "X-XXX-" + c);
}

export function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = (now - d) / 1000;
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} วันที่แล้ว`;
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}