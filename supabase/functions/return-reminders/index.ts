import { createClient } from "npm:@supabase/supabase-js@2";

const hour = 60 * 60 * 1000;

function getAdminKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default as string;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const jobSecret = Deno.env.get("RETURN_REMINDER_JOB_SECRET");
  if (!jobSecret || request.headers.get("x-return-job-secret") !== jobSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RETURN_EMAIL_FROM");
  const siteUrl = Deno.env.get("RETURN_SITE_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = getAdminKey();
  if (!resendKey || !from || !siteUrl || !supabaseUrl || !adminKey) {
    return Response.json({ error: "Return email secrets are incomplete" }, { status: 503 });
  }

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const oneDayAgo = new Date(Date.now() - 24 * hour).toISOString();
  const threeDaysAgo = new Date(Date.now() - 72 * hour).toISOString();
  const { data: handovers, error } = await admin.from("return_handovers")
    .select("id,post_id,conversation_id,recipient_id,attempt_count,initiated_at,initial_email_sent_at,reminder_24h_sent_at,reminder_72h_sent_at")
    .eq("state", "WAITING_RECEIPT")
    .or(`initial_email_sent_at.is.null,and(initiated_at.lte.${oneDayAgo},reminder_24h_sent_at.is.null),and(initiated_at.lte.${threeDaysAgo},reminder_72h_sent_at.is.null)`)
    .order("initiated_at", { ascending: true })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;
  for (const handover of handovers || []) {
    const age = Date.now() - new Date(handover.initiated_at).getTime();
    const stage = !handover.initial_email_sent_at ? "initial"
      : age >= 24 * hour && !handover.reminder_24h_sent_at ? "24h"
        : age >= 72 * hour && !handover.reminder_72h_sent_at ? "72h" : null;
    if (!stage) continue;

    const { data: current } = await admin.from("return_handovers")
      .select("state,attempt_count")
      .eq("id", handover.id).maybeSingle();
    if (current?.state !== "WAITING_RECEIPT" || current.attempt_count !== handover.attempt_count) continue;

    const { data: recipient, error: userError } = await admin.auth.admin.getUserById(handover.recipient_id);
    if (userError || !recipient.user?.email) { failed++; continue; }
    const { data: post } = await admin.from("app_records").select("data")
      .eq("id", handover.post_id).eq("entity", "Post").maybeSingle();
    const title = String(post?.data?.title || "ประกาศของคุณ");
    const link = `${siteUrl.replace(/\/$/, "")}/messages/${handover.conversation_id}`;
    const subject = stage === "initial" ? "กรุณายืนยันว่าได้รับของแล้ว · PobJer"
      : "แจ้งเตือน: กรุณายืนยันการรับของ · PobJer";
    const message = stage === "initial"
      ? `ผู้ส่งมอบแจ้งว่าส่งคืนของจากประกาศ “${title}” แล้ว\n\nหากคุณได้รับของจริง กรุณาเข้าสู่ระบบเพื่อยืนยัน หากยังไม่ได้รับ ให้กด “ยังไม่ได้รับ” ในห้องสนทนา\n\n${link}`
      : `รายการส่งคืนจากประกาศ “${title}” ยังรอการยืนยันของคุณ\n\nกรุณาเข้าสู่ระบบแล้วเลือก “ได้รับของแล้ว” หรือ “ยังไม่ได้รับ”\n\n${link}`;

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `pobjer-return-${handover.id}-${handover.attempt_count}-${stage}`,
        },
        body: JSON.stringify({ from, to: recipient.user.email, subject, text: message }),
      });
      if (!response.ok) { failed++; continue; }

      const column = stage === "initial" ? "initial_email_sent_at"
        : stage === "24h" ? "reminder_24h_sent_at" : "reminder_72h_sent_at";
      const { error: updateError } = await admin.from("return_handovers")
        .update({ [column]: new Date().toISOString() })
        .eq("id", handover.id).eq("state", "WAITING_RECEIPT")
        .eq("attempt_count", handover.attempt_count);
      if (updateError) { failed++; continue; }
      if (stage !== "initial") {
        await admin.from("app_records").insert({
          entity: "Notification",
          data: {
            user_id: handover.recipient_id,
            type: "RETURN_HANDOVER",
            title: "ยังรอการยืนยันรับของ",
            body: "กรุณากลับมายืนยันว่าได้รับของแล้วหรือยังไม่ได้รับ",
            reference_id: handover.post_id,
            conversation_id: handover.conversation_id,
            handover_id: handover.id,
          },
        });
      }
      sent++;
    } catch {
      failed++;
    }
  }

  return Response.json({ checked: handovers?.length || 0, sent, failed });
});
