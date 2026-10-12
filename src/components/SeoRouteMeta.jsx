import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const titles = {
  "/": "PobJer | แจ้งของหายและของที่พบ ตามหาเจ้าของ",
  "/map": "แผนที่ของหายและของที่พบ | PobJer",
  "/search": "ค้นหาประกาศของหายและของที่พบ | PobJer",
  "/post/new": "สร้างประกาศของหายหรือของที่พบ | PobJer",
  "/login": "เข้าสู่ระบบ | PobJer",
  "/register": "สมัครสมาชิก | PobJer",
  "/forgot-password": "ลืมรหัสผ่าน | PobJer",
  "/reset-password": "ตั้งรหัสผ่านใหม่ | PobJer",
  "/messages": "ข้อความ | PobJer",
  "/notifications": "การแจ้งเตือน | PobJer",
  "/profile": "โปรไฟล์ | PobJer",
  "/admin": "จัดการระบบ | PobJer",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.pobjer.com/#website",
  url: "https://www.pobjer.com/",
  name: "PobJer",
  description: "PobJer พื้นที่แจ้งของหายและของที่พบ ช่วยส่งสิ่งของกลับคืนเจ้าของ",
  inLanguage: "th",
};

export default function SeoRouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = titles[pathname] || (pathname.startsWith("/post/") ? "ประกาศของหายและของที่พบ | PobJer" : pathname.startsWith("/messages/") ? titles["/messages"] : "ไม่พบหน้า | PobJer");

    let websiteScript = document.getElementById("pobjer-website-jsonld");
    if (pathname === "/") {
      if (!websiteScript) {
        websiteScript = document.createElement("script");
        websiteScript.id = "pobjer-website-jsonld";
        websiteScript.type = "application/ld+json";
        websiteScript.textContent = JSON.stringify(websiteSchema);
        document.head.appendChild(websiteScript);
      }
    } else {
      websiteScript?.remove();
    }

    if (!/^\/post\/[^/]+\/?$/.test(pathname) || pathname === "/post/new") {
      document.getElementById("pobjer-post-jsonld")?.remove();
    }
  }, [pathname]);

  return null;
}
