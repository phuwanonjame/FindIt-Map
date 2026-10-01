import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ChevronLeft, ChevronRight, ImagePlus, X, MapPin, Navigation, Check, AlertCircle, CircleDot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CATEGORIES, CATEGORY_MAP, LOCATION_PRIVACY, HOLDER_TYPES, BANGKOK_CENTER } from "@/lib/constants";
import { CategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";

const pickerIcon = L.divIcon({
  className: "findit-picker",
  html: `<svg width="36" height="44" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24s16-13 16-24C32 7.16 24.84 0 16 0z" fill="#2563EB"/><circle cx="16" cy="16" r="11" fill="white"/></svg>`,
  iconSize: [36, 44],
  iconAnchor: [18, 44],
});

function LocationPicker({ position, setPosition }) {
  const [search, setSearch] = useState("");
  const map = useMapEvents({
    click(e) { setPosition([e.latlng.lat, e.latlng.lng]); },
  });

  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position]);

  const searchPlace = async () => {
    if (!search.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`);
      const data = await res.json();
      if (data[0]) {
        const pos = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setPosition(pos);
        map.setView(pos, 15);
      }
    } catch {}
  };

  return (
    <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchPlace())}
        placeholder="ค้นหาสถานที่..."
        className="flex-1 px-3.5 py-2 rounded-full bg-card border border-border text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <button onClick={searchPlace} className="px-3.5 rounded-full bg-primary text-white text-sm font-semibold shadow-sm">ค้นหา</button>
    </div>
  );
}

export default function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [postType, setPostType] = useState(null);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: "", title: "", description: "",
    brand: "", model: "", color: "",
    event_date: new Date().toISOString().slice(0, 10),
    event_time_from: "", event_time_to: "", timeUncertain: false,
    latitude: null, longitude: null,
    place_name: "", landmark: "",
    location_privacy: "APPROX_100M",
    images: [],
    reward_enabled: false, reward_text: "",
    current_holder_type: "WITH_FINDER",
    holder_name: "", holder_role: "", holder_phone: "", holder_line_id: "",
    holder_location_name: "", holder_counter_name: "", holder_note: "",
    verification_note: "",
    contact_chat: true, contact_phone: false, contact_line: false, contact_email: false,
    pet_name: "", pet_species: "", pet_breed: "", pet_gender: "", pet_collar: "", pet_microchip: "",
  });

  useEffect(() => { if (!user) navigate("/login"); }, [user]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleFiles = async (files) => {
    const remaining = 5 - form.images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} ใหญ่เกิน 10MB`); continue; }
      try {
        const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
        update("images", [...form.images, file_uri]);
      } catch { toast.error("อัปโหลดรูปไม่สำเร็จ"); }
    }
  };

  const removeImage = (i) => update("images", form.images.filter((_, idx) => idx !== i));
  const moveImage = (i, dir) => {
    const arr = [...form.images];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update("images", arr);
  };

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      update("latitude", pos.coords.latitude);
      update("longitude", pos.coords.longitude);
    });
  };

  const computePublicCoords = () => {
    if (!form.latitude) return {};
    const privacy = form.location_privacy;
    if (privacy === "EXACT" || privacy === "LANDMARK_ONLY") return { public_latitude: form.latitude, public_longitude: form.longitude };
    const offsetMeters = privacy === "APPROX_300M" ? 300 : 100;
    const angle = Math.random() * 2 * Math.PI;
    const dist = (Math.random() * 0.7 + 0.3) * offsetMeters;
    const dLat = dist / 111111;
    const dLng = dist / (111111 * Math.cos(form.latitude * Math.PI / 180));
    return {
      public_latitude: form.latitude + dLat * Math.sin(angle),
      public_longitude: form.longitude + dLng * Math.cos(angle),
    };
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const pub = computePublicCoords();
      const isPet = form.category === "pet";
      const status = postType === "LOST" ? "SEARCHING" : "WAITING_OWNER";
      const payload = {
        post_type: postType,
        title: form.title, description: form.description, category: form.category,
        brand: form.brand, model: form.model, color: form.color,
        event_date: form.event_date,
        event_time_from: form.event_time_from,
        event_time_to: form.timeUncertain ? form.event_time_to : form.event_time_from,
        latitude: form.latitude, longitude: form.longitude,
        public_latitude: pub.public_latitude, public_longitude: pub.public_longitude,
        place_name: form.place_name, landmark: form.landmark,
        location_privacy: form.location_privacy,
        status,
        reward_enabled: form.reward_enabled, reward_text: form.reward_text,
        images: form.images,
        verification_note: postType === "FOUND" ? form.verification_note : "",
        contact_chat: form.contact_chat, contact_phone: form.contact_phone,
        contact_line: form.contact_line, contact_email: form.contact_email,
        current_holder_type: postType === "FOUND" ? form.current_holder_type : "",
        holder_name: form.holder_name, holder_role: form.holder_role,
        holder_phone: form.holder_phone, holder_line_id: form.holder_line_id,
        holder_location_name: form.holder_location_name, holder_counter_name: form.holder_counter_name,
        holder_note: form.holder_note,
        pet_name: isPet ? form.pet_name : "", pet_species: isPet ? form.pet_species : "",
        pet_breed: isPet ? form.pet_breed : "", pet_gender: isPet ? form.pet_gender : "",
        pet_collar: isPet ? form.pet_collar : "", pet_microchip: isPet ? form.pet_microchip : "",
      };
      const created = await base44.entities.Post.create(payload);
      await base44.entities.PostEvent.create({ post_id: created.id, event_type: "POST_CREATED", user_id: user?.id, user_name: user?.full_name || "ผู้ใช้", description: postType === "LOST" ? "แจ้งของหาย" : "แจ้งพบของ" });
      toast.success("สร้างประกาศสำเร็จ!");
      navigate(`/post/${created.id}`);
    } catch (e) {
      toast.error(e.message || "สร้างประกาศไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (!postType) {
    return (
      <div className="max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-extrabold mb-1">แจ้งประกาศ</h1>
        <p className="text-sm text-muted-foreground mb-6">เลือกประเภทประกาศที่ต้องการสร้าง</p>
        <div className="grid md:grid-cols-2 gap-4">
          <button onClick={() => setPostType("LOST")} className="text-left p-6 rounded-3xl border-2 border-border hover:border-lost hover:shadow-lg transition group bg-card">
            <div className="w-14 h-14 rounded-2xl bg-lost/10 flex items-center justify-center mb-4"><CircleDot className="h-7 w-7 text-lost" /></div>
            <h2 className="text-xl font-bold mb-1">ของหาย</h2>
            <p className="text-sm text-muted-foreground mb-4">ฉันทำของหายและกำลังตามหา</p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-lost text-white text-sm font-semibold group-hover:gap-2.5 transition-all">แจ้งของหาย <ChevronRight className="w-4 h-4" /></span>
          </button>
          <button onClick={() => setPostType("FOUND")} className="text-left p-6 rounded-3xl border-2 border-border hover:border-found hover:shadow-lg transition group bg-card">
            <div className="w-14 h-14 rounded-2xl bg-found/10 flex items-center justify-center mb-4"><CircleDot className="h-7 w-7 text-found" /></div>
            <h2 className="text-xl font-bold mb-1">พบของ</h2>
            <p className="text-sm text-muted-foreground mb-4">ฉันพบของและต้องการตามหาเจ้าของ</p>
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-found text-white text-sm font-semibold group-hover:gap-2.5 transition-all">แจ้งพบของ <ChevronRight className="w-4 h-4" /></span>
          </button>
        </div>
      </div>
    );
  }

  const isPet = form.category === "pet";
  const steps = postType === "FOUND"
    ? ["ของ", "รูปภาพ", "เวลา", "สถานที่", "ติดต่อ", "ผู้เก็บของ"]
    : ["ของ", "รูปภาพ", "เวลา", "สถานที่", "ติดต่อ", "รางวัล"];

  const canNext = () => {
    if (step === 0) return form.category && form.title && form.description;
    if (step === 2) return form.event_date;
    if (step === 3) return form.latitude != null;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === 0 ? setPostType(null) : setStep(step - 1)} className="p-2 rounded-full hover:bg-accent"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">{postType === "LOST" ? "แจ้งของหาย" : "แจ้งพบของ"}</h1>
          <p className="text-xs text-muted-foreground">ขั้นตอนที่ {step + 1} จาก {steps.length} · {steps[step]}</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-6">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full transition", i <= step ? "bg-primary" : "bg-accent")} />
        ))}
      </div>

      <div className="bg-card rounded-3xl border border-border p-5 md:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">หมวดหมู่ <span className="text-lost">*</span></label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => update("category", c.id)} className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition", form.category === c.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent")}>
                    <CategoryIcon id={c.id} className="w-6 h-6" />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">ชื่อของ <span className="text-lost">*</span></label>
              <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="เช่น กระเป๋าสตางค์สีดำ" className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">รายละเอียด <span className="text-lost">*</span></label>
              <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} placeholder="เช่น กระเป๋าหนังสีดำ มีซิปด้านข้าง ภายในมีบัตรหลายใบ" className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </div>
            {(form.category === "phone" || form.category === "electronics") && (
              <div className="grid grid-cols-3 gap-2">
                <input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="แบรนด์" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="รุ่น" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={form.color} onChange={(e) => update("color", e.target.value)} placeholder="สี" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            {form.category === "wallet" && (
              <div className="grid grid-cols-2 gap-2">
                <input value={form.color} onChange={(e) => update("color", e.target.value)} placeholder="สี" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="แบรนด์/วัสดุ" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            {isPet && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm font-semibold">ข้อมูลสัตว์เลี้ยงเพิ่มเติม</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.pet_name} onChange={(e) => update("pet_name", e.target.value)} placeholder="ชื่อสัตว์เลี้ยง" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={form.pet_species} onChange={(e) => update("pet_species", e.target.value)} placeholder="สปีชีส์" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={form.pet_breed} onChange={(e) => update("pet_breed", e.target.value)} placeholder="สายพันธุ์" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <select value={form.pet_gender} onChange={(e) => update("pet_gender", e.target.value)} className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option value="">เพศ</option>
                    <option value="male">เพศผู้</option>
                    <option value="female">เพศเมีย</option>
                  </select>
                  <input value={form.pet_collar} onChange={(e) => update("pet_collar", e.target.value)} placeholder="ปลอกคอ" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={form.pet_microchip} onChange={(e) => update("pet_microchip", e.target.value)} placeholder="ไมโครชิป" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">รูปภาพ (สูงสุด 5 รูป)</label>
              <p className="text-xs text-muted-foreground mb-3">รูปแรกจะเป็นรูปหลัก · รองรับ JPG, PNG, WEBP · สูงสุด 10MB/รูป</p>
              <label className="block border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition">
                <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">แตะเพื่อเลือกรูป</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>
            </div>
            {form.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {i === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-primary text-white text-[10px] font-bold">หลัก</span>}
                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                    <div className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => moveImage(i, -1)} disabled={i === 0} className="w-6 h-6 rounded-full bg-white/90 text-xs disabled:opacity-30">←</button>
                      <button onClick={() => moveImage(i, 1)} disabled={i === form.images.length - 1} className="w-6 h-6 rounded-full bg-white/90 text-xs disabled:opacity-30">→</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-start p-3 rounded-xl bg-warning/10 border border-warning/20">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">กรุณาปิดข้อมูลส่วนตัวก่อนอัปโหลด เช่น เลขบัตรประชาชน เลขบัตรเครดิต</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">{postType === "LOST" ? "วันที่คาดว่าหาย" : "วันที่พบ"}</label>
              <input type="date" value={form.event_date} onChange={(e) => update("event_date", e.target.value)} className="px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.timeUncertain} onChange={(e) => update("timeUncertain", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm">ไม่แน่ใจเวลาที่แน่นอน</span>
            </label>
            {form.timeUncertain ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">เวลาเริ่ม</label>
                  <input type="time" value={form.event_time_from} onChange={(e) => update("event_time_from", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">เวลาสิ้นสุด</label>
                  <input type="time" value={form.event_time_to} onChange={(e) => update("event_time_to", e.target.value)} className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold mb-1.5 block">{postType === "LOST" ? "เวลาคาดว่าหาย" : "เวลาที่พบ"}</label>
                <input type="time" value={form.event_time_from} onChange={(e) => update("event_time_from", e.target.value)} className="px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">{postType === "LOST" ? "จุดที่คาดว่าทำหาย" : "จุดที่พบของ"}</label>
              <div className="relative rounded-2xl overflow-hidden border border-border" style={{ height: 320 }}>
                <MapContainer center={form.latitude ? [form.latitude, form.longitude] : BANGKOK_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
                  <LocationPicker position={form.latitude ? [form.latitude, form.longitude] : null} setPosition={(pos) => { update("latitude", pos[0]); update("longitude", pos[1]); }} />
                  {form.latitude && <Marker position={[form.latitude, form.longitude]} icon={pickerIcon} />}
                </MapContainer>
              </div>
              <button onClick={useCurrentLocation} className="w-full mt-2 px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-semibold flex items-center justify-center gap-1.5"><Navigation className="w-4 h-4" /> ใช้ตำแหน่งปัจจุบัน</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.place_name} onChange={(e) => update("place_name", e.target.value)} placeholder="ชื่อสถานที่ เช่น Central Ladprao" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.landmark} onChange={(e) => update("landmark", e.target.value)} placeholder="จุดสังเกต เช่น ชั้น 4 Food Court" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">ความเปิดเผยตำแหน่ง</label>
              <p className="text-xs text-muted-foreground mb-2">เพื่อความปลอดภัย ตำแหน่งที่แสดงต่อสาธารณะจะถูกปรับให้ไม่แม่นยำตามที่เลือก</p>
              <div className="grid grid-cols-2 gap-2">
                {LOCATION_PRIVACY.map((p) => (
                  <button key={p.value} onClick={() => update("location_privacy", p.value)} className={cn("px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition text-left", form.location_privacy === p.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {form.latitude != null && (
              <div className="text-xs text-muted-foreground bg-accent rounded-xl p-2.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">ช่องทางติดต่อ</label>
              <p className="text-xs text-muted-foreground mb-3">เบอร์โทร/LINE/Email จะไม่แสดงต่อสาธารณะ จนกว่าจะอนุมัติ Claim</p>
              <div className="space-y-2">
                {[
                  { k: "contact_chat", label: "แชทในระบบ", desc: "แนะนำ — ปลอดภัยที่สุด" },
                  { k: "contact_phone", label: "โทรศัพท์" },
                  { k: "contact_line", label: "LINE" },
                  { k: "contact_email", label: "อีเมล" },
                ].map((c) => (
                  <label key={c.k} className={cn("flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition", form[c.k] ? "border-primary bg-primary/5" : "border-border")}>
                    <input type="checkbox" checked={form[c.k]} onChange={(e) => update(c.k, e.target.checked)} className="w-4 h-4 rounded" />
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      {c.desc && <div className="text-xs text-muted-foreground">{c.desc}</div>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {postType === "FOUND" && (
              <div>
                <label className="text-sm font-semibold mb-1.5 block">ข้อมูลลับสำหรับยืนยันเจ้าของ</label>
                <p className="text-xs text-muted-foreground mb-2">ใช้เพื่อเปรียบเทียบคำตอบ Claim — ห้ามแสดงต่อสาธารณะ</p>
                <textarea value={form.verification_note} onChange={(e) => update("verification_note", e.target.value)} rows={2} placeholder="เช่น ด้านหลังโทรศัพท์มี Sticker ตัวการ์ตูนสีเหลือง" className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            )}
          </div>
        )}

        {step === 5 && postType === "FOUND" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">ตอนนี้ของอยู่ที่ไหน?</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(HOLDER_TYPES).map(([k, v]) => (
                  <button key={k} onClick={() => update("current_holder_type", k)} className={cn("flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition text-left", form.current_holder_type === k ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-accent")}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            {form.current_holder_type === "DEPOSITED" && (
              <div className="space-y-2 border-t border-border pt-3">
                <input value={form.holder_location_name} onChange={(e) => update("holder_location_name", e.target.value)} placeholder="สถานที่ฝาก เช่น Central Ladprao" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input value={form.holder_counter_name} onChange={(e) => update("holder_counter_name", e.target.value)} placeholder="จุดรับของ เช่น Information Counter ชั้น G" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            )}
            {form.current_holder_type === "TAKEN_BY_OTHER" && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">ข้อมูลผู้รับของจะไม่แสดงเบอร์เต็มต่อสาธารณะ</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.holder_name} onChange={(e) => update("holder_name", e.target.value)} placeholder="ชื่อผู้รับของ" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  <input value={form.holder_role} onChange={(e) => update("holder_role", e.target.value)} placeholder="บทบาท เช่น รปภ. พนักงาน" className="px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <textarea value={form.holder_note} onChange={(e) => update("holder_note", e.target.value)} rows={2} placeholder="หมายเหตุ" className="w-full px-3 py-2 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
            )}
          </div>
        )}
        {step === 5 && postType === "LOST" && (
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 rounded-xl border-2 border-border cursor-pointer">
              <div>
                <div className="text-sm font-semibold">มีรางวัล</div>
                <div className="text-xs text-muted-foreground">เพิ่มสินน้ำใจเพื่อกระตุ้นให้คนช่วยตามหา</div>
              </div>
              <input type="checkbox" checked={form.reward_enabled} onChange={(e) => update("reward_enabled", e.target.checked)} className="w-5 h-5 rounded" />
            </label>
            {form.reward_enabled && (
              <input value={form.reward_text} onChange={(e) => update("reward_text", e.target.value)} placeholder="เช่น มีสินน้ำใจ 500 บาท" className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={() => step === 0 ? setPostType(null) : setStep(step - 1)} className="px-5 py-3 rounded-full border border-border text-sm font-semibold hover:bg-accent">ย้อนกลับ</button>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(step + 1)} disabled={!canNext()} className="flex-1 px-5 py-3 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">ถัดไป <ChevronRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={submit} disabled={submitting} className="flex-1 px-5 py-3 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5">{submitting ? "กำลังสร้าง..." : "สร้างประกาศ"} <Check className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  );
}
