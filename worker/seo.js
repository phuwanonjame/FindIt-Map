const SITE = "https://www.pobjer.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

const plainText = (value, maxLength = 180) => String(value ?? "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, maxLength);

const safeImage = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
};

function setMeta(html, { title, description, url, image, type = "website", robots = "index,follow" }) {
  const meta = (name, content, property = false) => `<meta ${property ? "property" : "name"}="${name}" content="${escapeHtml(content)}" />`;
  const replacements = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`],
    [/<meta name="description"[^>]*>/i, meta("description", description)],
    [/<meta property="og:title"[^>]*>/i, meta("og:title", title, true)],
    [/<meta property="og:description"[^>]*>/i, meta("og:description", description, true)],
    [/<meta property="og:type"[^>]*>/i, meta("og:type", type, true)],
  ];
  let output = html;
  for (const [pattern, replacement] of replacements) output = output.replace(pattern, replacement);
  output = output.replace(/<link rel="canonical"[^>]*>/i, "");
  output = output.replace(/<meta (?:name="robots"|property="og:url"|property="og:image"|name="twitter:card"|name="twitter:title"|name="twitter:description"|name="twitter:image")[^>]*>/gi, "");
  const tags = [
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta("robots", robots),
    meta("og:url", url, true),
    meta("og:image", image || `${SITE}/pobjer-icon.png`, true),
    meta("twitter:card", "summary_large_image"),
    meta("twitter:title", title),
    meta("twitter:description", description),
    meta("twitter:image", image || `${SITE}/pobjer-icon.png`),
  ];
  return output.replace("</head>", `${tags.join("\n    ")}\n  </head>`);
}

async function appHtml(request, env) {
  const indexUrl = new URL("/index.html", request.url);
  const response = await env.ASSETS.fetch(new Request(indexUrl));
  if (!response.ok) throw new Error("index.html unavailable");
  return response.text();
}

function htmlResponse(html, status = 200, extraHeaders = {}) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      ...extraHeaders,
    },
  });
}

async function publicPosts(request, env, query) {
  const configResponse = await env.ASSETS.fetch(new Request(new URL("/seo-public-config.json", request.url)));
  if (!configResponse.ok) throw new Error("SEO public configuration is missing");
  const { url: base, key } = await configResponse.json();
  if (!base || !key) throw new Error("SEO public configuration is incomplete");
  const url = new URL("/rest/v1/app_records", base);
  url.search = query.toString();
  const response = await fetch(url, {
    headers: { apikey: key, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Public posts request failed: ${response.status}`);
  return response.json();
}

async function postPage(request, env, id) {
  const query = new URLSearchParams({ select: "id,created_at,updated_at,data", entity: "eq.Post", id: `eq.${id}`, limit: "1" });
  let rows;
  try {
    rows = await publicPosts(request, env, query);
  } catch {
    // Preserve the browser app, but ask crawlers to retry a temporary outage
    // instead of indexing a generic shell as a listing.
    const fallback = await appHtml(request, env);
    return htmlResponse(fallback, 503, { "X-Robots-Tag": "noindex", "Retry-After": "60" });
  }

  const row = rows[0];
  if (!row) return htmlResponse("<!doctype html><html lang=\"th\"><meta charset=\"utf-8\"><title>ไม่พบประกาศ | PobJer</title><meta name=\"robots\" content=\"noindex\"><body><h1>ไม่พบประกาศ</h1><a href=\"/search\">ดูประกาศอื่น</a></body></html>", 404, { "X-Robots-Tag": "noindex" });

  const post = row.data || {};
  const label = post.post_type === "FOUND" ? "พบของ" : "ของหาย";
  const name = plainText(post.title, 100) || "ประกาศ";
  const place = plainText(post.place_name, 100);
  const details = plainText(post.description, 180);
  const title = `${label}: ${name}${place ? ` ที่${place}` : ""} | PobJer`;
  const description = `${label} ${name}${place ? ` บริเวณ${place}` : ""}${details ? ` — ${details}` : " ดูรายละเอียดและติดต่อผ่าน PobJer"}`;
  const image = safeImage(post.images?.[0]);
  const url = `${SITE}/post/${id}`;
  let html = setMeta(await appHtml(request, env), { title, description, image, url, type: "article", robots: post.status === "CLOSED" ? "noindex,follow" : "index,follow" });
  const body = `<main lang="th" style="max-width:760px;margin:3rem auto;padding:1rem;font-family:Arial,sans-serif"><p>${escapeHtml(label)}${place ? ` · ${escapeHtml(place)}` : ""}</p><h1>${escapeHtml(name)}</h1>${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" style="max-width:100%;height:auto" />` : ""}<p>${escapeHtml(plainText(post.description, 3000))}</p><p><a href="/search">ดูประกาศอื่นบน PobJer</a></p></main>`;
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return htmlResponse(html, 200, post.status === "CLOSED" ? { "X-Robots-Tag": "noindex" } : {});
}

async function sitemap(request, env) {
  const urls = ["/", "/search", "/map"].map((path) => `<url><loc>${SITE}${path}</loc></url>`);
  try {
    const query = new URLSearchParams({ select: "id,updated_at,data", entity: "eq.Post", order: "created_at.desc", limit: "1000" });
    const rows = await publicPosts(request, env, query);
    for (const row of rows) {
      if (row.data?.status === "CLOSED") continue;
      const lastmod = new Date(row.updated_at);
      urls.push(`<url><loc>${SITE}/post/${row.id}</loc>${Number.isNaN(lastmod.getTime()) ? "" : `<lastmod>${lastmod.toISOString()}</lastmod>`}</url>`);
    }
  } catch {
    // Static public pages remain discoverable if Supabase is temporarily unavailable.
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/sitemap.xml") return sitemap(request, env);
    if (path === "/post/new" || ["/login", "/register", "/forgot-password", "/reset-password", "/profile", "/notifications", "/admin"].includes(path) || path.startsWith("/messages")) {
      const response = await env.ASSETS.fetch(request);
      const headers = new Headers(response.headers);
      headers.set("X-Robots-Tag", "noindex, nofollow");
      return new Response(response.body, { status: response.status, headers });
    }
    const match = path.match(/^\/post\/([^/]+)\/?$/);
    if (match) return UUID.test(match[1]) ? postPage(request, env, match[1]) : htmlResponse("Not found", 404, { "X-Robots-Tag": "noindex" });
    if (path === "/search" || path === "/map") {
      const isSearch = path === "/search";
      const html = setMeta(await appHtml(request, env), {
        title: isSearch ? "ค้นหาประกาศของหายและของที่พบ | PobJer" : "แผนที่ของหายและของที่พบ | PobJer",
        description: isSearch ? "ค้นหาประกาศของหายและของที่พบจากชื่อสิ่งของและสถานที่บน PobJer" : "ดูตำแหน่งประกาศของหายและของที่พบจากแผนที่ PobJer",
        url: `${SITE}${path}`,
      });
      return htmlResponse(html);
    }
    return env.ASSETS.fetch(request);
  },
};
