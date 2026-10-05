import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Map as MapIcon, MapPin, PackageCheck, SearchX, Tags } from "lucide-react";

const quickLinks = [
  { href: "/search", title: "ประกาศล่าสุด", detail: "ดูของหายและของที่พบ", Icon: ClipboardList, color: "blue" },
  { href: "/map#findit-map-panel", title: "ตามพื้นที่", detail: "ดูประกาศบนแผนที่", Icon: MapPin, color: "rose" },
  { href: "/search", title: "หมวดหมู่", detail: "เลือกดูตามประเภทของ", Icon: Tags, color: "violet" },
  { href: "/map", title: "แผนที่ประกาศ", detail: "ดูจุดประกาศทั้งหมด", Icon: MapIcon, color: "amber" },
];

const quickTone = {
  blue: "bg-blue-50 text-blue-600",
  rose: "bg-rose-50 text-rose-500",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-500",
};

export default function CreatePostLanding({ onChooseType }) {
  return (
    <div className="w-full overflow-hidden bg-[#eaf4ff]">
      <section className="relative isolate min-h-[650px] overflow-hidden bg-[#d7edfc] pb-9 pt-12 sm:pt-14 lg:min-h-[570px] lg:pb-10">
        <img src="/pobjer-hero-bg.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center" />
        <div className="pointer-events-none absolute bottom-28 -left-16 z-0 h-[330px] w-[380px] opacity-40 sm:bottom-0 sm:left-0 sm:h-[470px] sm:w-[48%] sm:opacity-80 lg:-left-4 lg:h-[96%] lg:w-[45%] lg:opacity-100">
          <img src="/pobjer-dog.png" alt="" className="h-full w-full object-contain object-bottom" />
        </div>

        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-7">
          <div className="mx-auto max-w-[860px] text-center lg:ml-auto lg:mr-[7%] lg:w-[58%]">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-blue-700/75">Lost & Found Community</p>
            <h1 className="text-[clamp(3.8rem,8vw,7.3rem)] font-black leading-none tracking-[-0.075em] text-[#111e35] drop-shadow-sm"><span className="text-blue-600">Pob</span>Jer</h1>
            <h2 className="mt-3 text-xl font-extrabold tracking-tight text-[#13233d] sm:text-2xl lg:text-[27px]">ของที่หาย...อาจกำลังรอให้คุณพบอีกครั้ง</h2>
            <p className="mx-auto mt-2 max-w-[660px] text-sm leading-6 text-slate-600 sm:text-base">พื้นที่เล็ก ๆ ที่ช่วยเชื่อมต่อ “คนที่ทำหาย” กับ “คนที่พบเจอ” ให้สิ่งของกลับคืนเจ้าของได้ง่ายขึ้น</p>
          </div>

          <div className="mx-auto mt-8 grid max-w-[930px] gap-4 sm:grid-cols-2 lg:ml-auto lg:mr-[2%] lg:w-[69%]">
            <article className="group flex min-h-[205px] items-start gap-4 rounded-[28px] border border-rose-100 bg-white/90 p-5 shadow-[0_18px_48px_rgba(51,81,116,0.14)] backdrop-blur-md sm:p-6">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 sm:h-20 sm:w-20"><SearchX className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.8} /></span>
              <div className="flex h-full min-w-0 flex-col items-start">
                <h3 className="text-xl font-extrabold text-[#18263d] sm:text-2xl">แจ้งของหาย</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">ลงประกาศเมื่อคุณทำของหาย เพิ่มรายละเอียด รูปภาพ และสถานที่</p>
                <button type="button" onClick={() => onChooseType("LOST")} className="mt-auto inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-rose-600/20 transition hover:bg-rose-700">แจ้งของหาย <ArrowRight className="h-4 w-4" /></button>
              </div>
            </article>
            <article className="group flex min-h-[205px] items-start gap-4 rounded-[28px] border border-emerald-100 bg-white/90 p-5 shadow-[0_18px_48px_rgba(51,81,116,0.14)] backdrop-blur-md sm:p-6">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 sm:h-20 sm:w-20"><PackageCheck className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.8} /></span>
              <div className="flex h-full min-w-0 flex-col items-start">
                <h3 className="text-xl font-extrabold text-[#18263d] sm:text-2xl">พบของ</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">ลงประกาศเมื่อคุณพบสิ่งของ ช่วยส่งต่อให้เจ้าของกลับมารับได้</p>
                <button type="button" onClick={() => onChooseType("FOUND")} className="mt-auto inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700">แจ้งพบของ <ArrowRight className="h-4 w-4" /></button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-2 px-3 py-4 sm:px-5 lg:grid-cols-4 lg:px-7">
        {quickLinks.map(({ href, title, detail, Icon, color }) => (
          <Link key={title} to={href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4">
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${quickTone[color]}`}><Icon className="h-6 w-6" /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#142440] sm:text-base">{title}</strong><small className="block truncate text-[11px] text-slate-500 sm:text-xs">{detail}</small></span>
            <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 sm:block" />
          </Link>
        ))}
      </div>
    </div>
  );
}
