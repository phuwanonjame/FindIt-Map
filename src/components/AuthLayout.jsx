import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[1.08fr_.92fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -left-20 -top-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-blue-600/30 blur-3xl" />
          <div className="relative flex items-center gap-3 text-lg font-bold tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400 text-slate-950">⌖</span>
            FindIt Map
          </div>
          <div className="relative my-auto max-w-md">
            <p className="mb-5 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-cyan-100">COMMUNITY LOST & FOUND</p>
            <h2 className="text-4xl font-bold leading-tight">ของหายจะไม่หายไปกับความกังวล</h2>
            <p className="mt-5 text-base leading-7 text-slate-300">แจ้งเหตุ ปักหมุด และติดต่อกันอย่างปลอดภัยในที่เดียว เพื่อเพิ่มโอกาสให้สิ่งสำคัญกลับคืนสู่เจ้าของ</p>
          </div>
          <div className="relative grid grid-cols-3 gap-3 border-t border-white/10 pt-7 text-center">
            <div><strong className="block text-xl">01</strong><span className="text-xs text-slate-400">แจ้งประกาศ</span></div>
            <div><strong className="block text-xl">02</strong><span className="text-xs text-slate-400">ปักหมุดแผนที่</span></div>
            <div><strong className="block text-xl">03</strong><span className="text-xs text-slate-400">ส่งคืนปลอดภัย</span></div>
          </div>
        </section>
        <main className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-950 font-bold text-cyan-300">⌖</span>
              <span className="font-bold tracking-tight text-slate-900">FindIt Map</span>
            </div>
            <div className="mb-8">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
              {subtitle && <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>}
            </div>
            <div className="[&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:text-slate-950 [&_input]:shadow-none [&_input:focus]:border-cyan-500 [&_input:focus]:ring-2 [&_input:focus]:ring-cyan-100 [&_button[type=submit]]:bg-slate-950 [&_button[type=submit]]:hover:bg-slate-800">
              {children}
            </div>
            {footer && <p className="mt-7 text-center text-sm text-slate-500">{footer}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
