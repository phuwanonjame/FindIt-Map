import React from "react";
import { Link } from "react-router-dom";
import { LogIn, MessageCircle, PawPrint, Send, UserRoundPlus } from "lucide-react";

export default function MessagesGuest() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-68px)] flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#ffffff_0%,#f5f9ff_55%,#eaf3ff_100%)] px-4 py-10 text-[#0c1e45] sm:px-6 sm:py-14">
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#dceaff]/45 sm:h-80 sm:w-80" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-80 w-80 rounded-full bg-[#dceaff]/50 sm:h-[420px] sm:w-[420px]" />
      <Send aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[22%] hidden h-12 w-12 -rotate-12 fill-[#bcd7ff] text-[#bcd7ff] opacity-75 md:block" />
      <MessageCircle aria-hidden="true" className="pointer-events-none absolute right-[9%] top-[23%] hidden h-20 w-20 fill-[#d9e8ff] text-[#d9e8ff] opacity-80 md:block" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-[18%] left-[5%] hidden h-11 w-11 fill-[#d6e7ff] text-[#d6e7ff] opacity-80 md:block" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-[25%] right-[12%] hidden h-10 w-10 fill-[#d6e7ff] text-[#d6e7ff] opacity-80 md:block" />

      <div className="relative z-10 w-full max-w-[830px] overflow-hidden rounded-[26px] border border-white bg-white/90 text-center shadow-[0_22px_70px_rgba(63,112,178,0.12)]">
        <div className="relative mx-auto h-[205px] max-w-[650px] overflow-hidden sm:h-[260px]">
          <img src="/messages-guest-chat.png" alt="" className="pointer-events-none absolute left-[32%] top-[-15px] h-auto w-[350px] max-w-none select-none sm:left-[34%] sm:top-[-20px] sm:w-[450px]" />
          <img src="/messages-guest-dog.png" alt="" className="pointer-events-none absolute left-[12%] top-[31px] h-auto w-[190px] max-w-none select-none sm:left-[16%] sm:top-[40px] sm:w-[240px]" />
        </div>

        <div className="relative border-t border-[#e6effc] px-5 pb-9 pt-7 sm:px-12 sm:pb-11 sm:pt-8">
          <h1 className="text-[25px] font-bold leading-tight tracking-tight sm:text-[34px]">เข้าสู่ระบบเพื่อใช้งานข้อความ</h1>
          <p className="mx-auto mt-4 max-w-[590px] text-[15px] leading-7 text-[#60708d] sm:text-lg sm:leading-8">
            คุณสามารถพูดคุยกับผู้ที่พบของ หรือเจ้าของของที่คุณพบ<br className="hidden sm:block" /> เพื่อประสานการส่งคืนได้อย่างสะดวกและปลอดภัย
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link to="/login" className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#2863ea] px-8 text-base font-semibold text-white shadow-[0_7px_16px_rgba(40,99,234,0.15)] transition hover:bg-[#1955da] sm:w-auto">
              <LogIn className="h-5 w-5" /> เข้าสู่ระบบ
            </Link>
            <Link to="/register" className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[#b9c9e1] bg-white px-7 text-base font-semibold text-[#142b54] transition hover:bg-blue-50 sm:w-auto">
              <UserRoundPlus className="h-5 w-5" /> สมัครสมาชิก
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
