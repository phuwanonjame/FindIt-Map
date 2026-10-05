import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SEED_ID = "pobjer-demo-posts-v1";
const mode = process.argv[2] || "--dry-run";
const allowedModes = new Set(["--dry-run", "--apply", "--verify-public", "--remove-demo-posts"]);
if (!allowedModes.has(mode)) throw new Error("Use --dry-run, --apply, --verify-public, or --remove-demo-posts");

const locations = [
  ["สถานี BTS สยาม", 13.7456, 100.5341, "บริเวณทางออกฝั่งสยามสแควร์"],
  ["สวนลุมพินี", 13.7309, 100.5417, "ใกล้ประตูฝั่งถนนวิทยุ"],
  ["สถานี MRT สุขุมวิท", 13.7371, 100.5612, "บริเวณทางเชื่อมสถานี"],
  ["เซ็นทรัลลาดพร้าว", 13.8151, 100.5604, "ใกล้ทางเข้าชั้น G"],
  ["อนุสาวรีย์ชัยสมรภูมิ", 13.7648, 100.5384, "บริเวณทางเดินเชื่อม BTS"],
  ["สถานี BTS อารีย์", 13.7796, 100.5447, "ฝั่งทางออกถนนพหลโยธิน"],
  ["ท่าพระจันทร์", 13.7566, 100.4891, "บริเวณทางเดินริมแม่น้ำ"],
  ["ไอคอนสยาม", 13.7266, 100.5101, "ใกล้ทางเข้าฝั่งท่าเรือ"],
  ["สถานี BTS อ่อนนุช", 13.7053, 100.6012, "ใกล้ทางออกฝั่งสุขุมวิท"],
  ["ตลาดนัดจตุจักร", 13.7997, 100.5502, "บริเวณทางเข้าตลาด"],
  ["สถานี MRT ห้วยขวาง", 13.7786, 100.5738, "ใกล้ทางออกสถานี"],
  ["เมกาบางนา", 13.6468, 100.6806, "บริเวณทางเข้าศูนย์การค้า"],
  ["มหาวิทยาลัยเกษตรศาสตร์", 13.8473, 100.5693, "บริเวณประตูทางเข้า"],
  ["สถานี BTS กรุงธนบุรี", 13.7208, 100.5029, "บริเวณทางเดินเชื่อมสถานี"],
  ["สถานี MRT สามย่าน", 13.7331, 100.5292, "ใกล้ทางออกฝั่งถนนพระราม 4"],
];

// Deliberately fictional reports. Titles and descriptions disclose that they are examples.
const examples = [
  ["phone", "LOST", "โทรศัพท์ Samsung Galaxy S24 สีดำ", "เครื่องใส่เคสใส ขอบมุมขวามีรอยเล็กน้อย คาดว่าหล่นระหว่างเดินออกจากสถานี", "Samsung", "Galaxy S24", "ดำ"],
  ["phone", "FOUND", "โทรศัพท์ iPhone 15 สีฟ้า", "พบโทรศัพท์พร้อมเคสสีครีมวางอยู่บนม้านั่ง ใครเป็นเจ้าของช่วยบอกลักษณะหน้าจอล็อก", "Apple", "iPhone 15", "ฟ้า"],
  ["phone", "LOST", "โทรศัพท์ OPPO Reno สีเขียว", "เครื่องอยู่ในซองผ้าสีเทา หายช่วงเปลี่ยนรถไฟฟ้า", "OPPO", "Reno", "เขียว"],
  ["wallet", "FOUND", "กระเป๋าสตางค์หนังสีน้ำตาล", "พบกระเป๋าหนังใบเล็ก ไม่มีการเปิดดูเอกสารภายใน เจ้าของแจ้งลักษณะเพื่อยืนยัน", "", "", "น้ำตาล"],
  ["wallet", "LOST", "กระเป๋าสตางค์ผ้าสีกรม", "กระเป๋าพับมีซิปด้านใน คาดว่าหล่นระหว่างเดินซื้อของ", "", "", "กรมท่า"],
  ["wallet", "FOUND", "กระเป๋าใส่เหรียญลายทาง", "พบกระเป๋าใบเล็กบนโต๊ะพักคอย กรุณาระบุของด้านในเพื่อยืนยัน", "", "", "ครีม"],
  ["bag", "LOST", "กระเป๋าสะพายผ้าสีดำ", "กระเป๋าสะพายขนาดกลาง มีพวงกุญแจผ้าติดซิปด้านหน้า", "", "", "ดำ"],
  ["bag", "FOUND", "เป้ผ้าสีเทา", "พบเป้วางอยู่ใกล้จุดนั่งพัก ยังไม่ได้เปิดตรวจด้านใน", "", "", "เทา"],
  ["bag", "LOST", "ถุงผ้าใบสีขาว", "ถุงผ้ามีลายสีน้ำเงิน ภายในเป็นหนังสือและสมุดโน้ต", "", "", "ขาว"],
  ["key", "FOUND", "พวงกุญแจรถพร้อมสายคล้อง", "พบกุญแจสองดอกพร้อมรีโมตรถ กรุณาบอกสีและยี่ห้อรถเพื่อยืนยัน", "", "", "ดำ"],
  ["key", "LOST", "กุญแจบ้านห้อยพวงรูปดาว", "พวงกุญแจมีสามดอกและจี้รูปดาวสีเงิน คาดว่าหล่นระหว่างเดิน", "", "", "เงิน"],
  ["key", "FOUND", "คีย์การ์ดพร้อมกุญแจเล็ก", "พบคีย์การ์ดในซองพลาสติกใส ไม่แสดงหมายเลขหรือข้อมูลส่วนตัว", "", "", "ฟ้า"],
  ["document", "LOST", "แฟ้มเอกสารสีฟ้า", "แฟ้ม A4 บรรจุเอกสารทั่วไป ไม่มีข้อมูลสำคัญที่เปิดเผยในประกาศ", "", "", "ฟ้า"],
  ["document", "FOUND", "ซองเอกสารสีน้ำตาล", "พบซองเอกสารปิดผนึกใกล้จุดรับส่งผู้โดยสาร เจ้าของแจ้งข้อความบนซองเพื่อยืนยัน", "", "", "น้ำตาล"],
  ["document", "LOST", "สมุดโน้ตปกสีเขียว", "สมุดขนาด A5 มีแถบคั่นหน้า คาดว่าลืมไว้หลังนั่งพัก", "", "", "เขียว"],
  ["card", "FOUND", "บัตรสมาชิกในซองใส", "พบบัตรในซองพลาสติก ไม่แสดงชื่อหรือหมายเลขบัตรสาธารณะ", "", "", "ใส"],
  ["card", "LOST", "ซองใส่บัตรสีแดง", "ซองบัตรใบเล็ก มีสายคล้องคอสีดำ ไม่ระบุข้อมูลบนบัตรในประกาศ", "", "", "แดง"],
  ["card", "FOUND", "บัตรโดยสารพร้อมสายคล้อง", "พบบัตรโดยสารในปลอกสีม่วง เจ้าของแจ้งลักษณะด้านหลังเพื่อยืนยัน", "", "", "ม่วง"],
  ["pet", "LOST", "สุนัขพันธุ์ชิสุสีน้ำตาลอ่อน", "สุนัขตัวเล็กใส่ปลอกคอสีน้ำเงิน ขี้ตกใจและไม่คุ้นคนแปลกหน้า", "", "", "น้ำตาลอ่อน"],
  ["pet", "FOUND", "แมวลายสลิดใส่ปลอกคอ", "พบแมวเชื่องใส่ปลอกคอสีชมพู อยู่ในบริเวณที่ปลอดภัยชั่วคราว", "", "", "ลายสลิด"],
  ["pet", "LOST", "นกแก้วตัวเล็กสีเขียว", "นกมีห่วงที่ขา บินออกจากบริเวณที่พักช่วงเช้า", "", "", "เขียว"],
  ["jewelry", "LOST", "สร้อยข้อมือสีเงิน", "สร้อยข้อมือเส้นบาง มีจี้ทรงกลมเล็ก ๆ คาดว่าหล่นระหว่างเดิน", "", "", "เงิน"],
  ["jewelry", "FOUND", "แหวนสีเงินหนึ่งวง", "พบแหวนใกล้ทางเดิน เจ้าของแจ้งลวดลายด้านในเพื่อยืนยัน", "", "", "เงิน"],
  ["jewelry", "LOST", "ต่างหูมุกหนึ่งข้าง", "ต่างหูมุกเม็ดเล็กหายหนึ่งข้าง ระหว่างเดินในอาคาร", "", "", "ขาว"],
  ["electronics", "FOUND", "หูฟังไร้สายพร้อมเคส", "พบกล่องหูฟังบนโต๊ะพัก เจ้าของแจ้งยี่ห้อและรอยตำหนิเพื่อยืนยัน", "", "", "ขาว"],
  ["electronics", "LOST", "แท็บเล็ตพร้อมเคสสีกรม", "แท็บเล็ตขนาดประมาณ 11 นิ้ว พร้อมปากกา คาดว่าลืมไว้หลังนั่งพัก", "", "", "กรมท่า"],
  ["electronics", "FOUND", "พาวเวอร์แบงก์สีขาว", "พบแบตเตอรี่สำรองพร้อมสายชาร์จสั้นในบริเวณที่นั่ง", "", "", "ขาว"],
  ["other", "LOST", "ร่มพับสีเหลือง", "ร่มพับขนาดเล็ก มีปลอกสีเดียวกัน คาดว่าลืมไว้ระหว่างฝนตก", "", "", "เหลือง"],
  ["other", "FOUND", "ขวดน้ำสแตนเลสสีฟ้า", "พบขวดน้ำบนโต๊ะนั่งพัก ไม่มีชื่อหรือเบอร์โทรติดอยู่", "", "", "ฟ้า"],
  ["other", "LOST", "กล่องแว่นตาสีดำ", "กล่องแข็งมีแว่นสายตาด้านใน คาดว่าหล่นจากกระเป๋า", "", "", "ดำ"],
];

const posts = examples.map(([category, postType, title, detail, brand, model, color], index) => {
  const [placeName, latitude, longitude, landmark] = locations[index % locations.length];
  const eventDate = new Date(Date.now() - (index % 14) * 86_400_000);
  const eventTime = `${String(8 + (index * 3) % 13).padStart(2, "0")}:${index % 2 ? "30" : "00"}`;
  const returned = index % 9 === 7;
  const status = returned ? "RETURNED" : postType === "LOST" ? "SEARCHING" : "WAITING_OWNER";
  return {
    demo_seed: SEED_ID,
    demo_key: `demo-${String(index + 1).padStart(2, "0")}`,
    post_type: postType,
    category,
    title: `[ตัวอย่าง] ${title}`,
    description: `${detail}\n\nประกาศตัวอย่างสำหรับทดสอบระบบ PobJer ไม่ใช่เหตุการณ์จริง`,
    brand,
    model,
    color,
    event_date: eventDate.toISOString().slice(0, 10),
    event_time_from: eventTime,
    event_time_to: eventTime,
    latitude,
    longitude,
    public_latitude: latitude,
    public_longitude: longitude,
    place_name: placeName,
    landmark,
    location_privacy: "APPROX_100M",
    status,
    returned_at: returned ? eventDate.toISOString() : null,
    images: [],
    reward_enabled: false,
    contact_chat: false,
    contact_phone: false,
    contact_line: false,
    contact_email: false,
    current_holder_type: postType === "FOUND" && !returned ? "WITH_FINDER" : "",
  };
});

if (mode === "--dry-run") {
  const counts = Object.fromEntries([...new Set(posts.map((post) => post.category))].map((category) => [category, posts.filter((post) => post.category === category).length]));
  console.log(JSON.stringify({ seed: SEED_ID, count: posts.length, categories: counts, statuses: posts.reduce((all, post) => ({ ...all, [post.status]: (all[post.status] || 0) + 1 }), {}) }, null, 2));
  process.exit(0);
}

let envFile = "";
try { envFile = readFileSync(".env.local", "utf8"); } catch { /* URL can also be set in the environment. */ }
const localUrl = envFile.match(/^VITE_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
const url = process.env.SUPABASE_URL || localUrl;
const localPublishable = envFile.match(/^VITE_SUPABASE_PUBLISHABLE_KEY=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
if (mode === "--verify-public") {
  if (!url || !localPublishable) throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local");
  const publicClient = createClient(url, localPublishable, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await publicClient.from("app_records").select("id,data").eq("entity", "Post").contains("data", { demo_seed: SEED_ID });
  if (error) throw error;
  console.log(JSON.stringify({ publicVisible: data.length, expected: posts.length }, null, 2));
  if (data.length !== posts.length) process.exitCode = 1;
} else {
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY (secret key must never be committed)");

const client = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const fail = (error) => { if (error) throw error; };
const existingQuery = () => client.from("app_records").select("id,data").eq("entity", "Post").contains("data", { demo_seed: SEED_ID });

if (mode === "--remove-demo-posts") {
  for (const entity of ["PostEvent", "Post"]) {
    const { data, error } = await client.from("app_records").delete().eq("entity", entity).contains("data", { demo_seed: SEED_ID }).select("id");
    fail(error);
    console.log(`Removed ${data.length} ${entity} demo records`);
  }
} else {
const { data: existing, error: readError } = await existingQuery();
fail(readError);
const existingKeys = new Set(existing.map((row) => row.data.demo_key));
const missing = posts.filter((post) => !existingKeys.has(post.demo_key));
if (missing.length) {
  const rows = missing.map((post, index) => ({
    entity: "Post",
    owner_id: null,
    data: post,
    created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
  }));
  const { error } = await client.from("app_records").insert(rows);
  fail(error);
}

const { data: verified, error: verifyError } = await existingQuery();
fail(verifyError);
const counts = verified.reduce((all, row) => ({ ...all, [row.data.category]: (all[row.data.category] || 0) + 1 }), {});
console.log(JSON.stringify({ seed: SEED_ID, inserted: missing.length, verified: verified.length, categories: counts }, null, 2));
if (verified.length !== posts.length) process.exitCode = 1;
}
}
