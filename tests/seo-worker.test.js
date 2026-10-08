import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import worker from "../worker/seo.js";

test("SEO worker returns listing HTML, a dynamic sitemap, and noindex for private pages", async () => {
  const html = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const config = readFileSync(new URL("../dist/seo-public-config.json", import.meta.url), "utf8");
  const id = "11111111-1111-4111-8111-111111111111";
  const post = {
    id,
    created_at: "2026-10-08T00:00:00Z",
    updated_at: "2026-10-08T01:00:00Z",
    data: { post_type: "LOST", title: "กระเป๋า <ดำ>", place_name: "กรุงเทพ", description: "หายใกล้สถานีรถไฟ", status: "SEARCHING", images: [] },
  };
  const env = {
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        if (path === "/seo-public-config.json") return new Response(config);
        return new Response(html, { headers: { "Content-Type": "text/html" } });
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify([post]), { headers: { "Content-Type": "application/json" } });
  try {
    const detail = await worker.fetch(new Request(`https://www.pobjer.com/post/${id}`), env);
    const detailHtml = await detail.text();
    assert.equal(detail.status, 200);
    assert.match(detailHtml, /<h1>กระเป๋า &lt;ดำ&gt;<\/h1>/);
    assert.match(detailHtml, new RegExp(`<link rel="canonical" href="https://www.pobjer.com/post/${id}"`));
    assert.match(detailHtml, /<meta property="og:title" content="ของหาย: กระเป๋า &lt;ดำ&gt;/);
    assert.doesNotMatch(detailHtml, /<h1>กระเป๋า <ดำ><\/h1>/);

    const sitemap = await worker.fetch(new Request("https://www.pobjer.com/sitemap.xml"), env);
    const xml = await sitemap.text();
    assert.match(xml, new RegExp(`https://www.pobjer.com/post/${id}`));
    assert.match(xml, /<lastmod>2026-10-08T01:00:00.000Z<\/lastmod>/);

    const login = await worker.fetch(new Request("https://www.pobjer.com/login"), env);
    assert.equal(login.headers.get("X-Robots-Tag"), "noindex, nofollow");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
