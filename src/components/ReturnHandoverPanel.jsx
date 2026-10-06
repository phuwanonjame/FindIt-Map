import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, HandHeart, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "react-hot-toast";
import { requireSupabase } from "@/api/supabaseClient";
import { getReturnHandover, respondReturnHandover, startReturnHandover } from "@/lib/returnHandover";

export default function ReturnHandoverPanel({ conversation, post, user, onChanged }) {
  const [handover, setHandover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const conversationId = conversation.id;
  const postType = post?.post_type || conversation.post_type;
  const postOwnerId = post?.created_by_id || conversation.participant_ids?.[1];
  const holderId = postType === "FOUND"
    ? postOwnerId
    : conversation.participant_ids?.find((id) => id !== postOwnerId);
  const isHolder = user.id === holderId;

  const refresh = useCallback(async () => {
    try {
      setHandover(await getReturnHandover(conversationId));
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30000);
    const channel = requireSupabase().channel(`pobjer-return-${conversationId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "return_handovers",
        filter: `conversation_id=eq.${conversationId}`,
      }, () => { refresh(); onChanged?.(); })
      .subscribe();
    return () => {
      window.clearInterval(timer);
      requireSupabase().removeChannel(channel);
    };
  }, [conversationId, refresh, onChanged]);

  const start = async () => {
    if (!window.confirm("ยืนยันว่าได้ส่งมอบของให้ผู้รับแล้ว? ระบบจะขอให้ผู้รับยืนยันอีกครั้งก่อนปิดประกาศ")) return;
    setSubmitting(true);
    try {
      setHandover(await startReturnHandover(conversationId));
      toast.success("แจ้งผู้รับให้ยืนยันการรับของแล้ว");
      window.dispatchEvent(new Event("pobjer:notifications-changed"));
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "เริ่มการยืนยันคืนของไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (received) => {
    if (!window.confirm(received
      ? "ยืนยันว่าคุณได้รับของชิ้นนี้แล้วจริง ๆ? เมื่อยืนยัน ประกาศจะถูกปิดเป็นส่งคืนแล้ว"
      : "ยืนยันว่าคุณยังไม่ได้รับของ? ประกาศจะยังไม่ถูกปิด")) return;
    setSubmitting(true);
    try {
      setHandover(await respondReturnHandover(conversationId, received));
      toast.success(received ? "ยืนยันรับของแล้ว ประกาศปิดเรียบร้อย" : "แจ้งผู้ส่งมอบแล้วว่ายังไม่ได้รับของ");
      window.dispatchEvent(new Event("pobjer:notifications-changed"));
      onChanged?.();
    } catch (error) {
      toast.error(error.message || "ยืนยันสถานะการรับของไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !postType || !postOwnerId) return null;
  if (!available) return <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 md:mx-5">ระบบยืนยันการส่งคืนยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ</div>;
  if (!handover && (post?.status === "RETURNED" || post?.status === "CLOSED")) return null;

  return <div className="mx-4 mt-3 rounded-2xl border border-[#dbe8fb] bg-[#f6faff] px-4 py-3 text-sm text-[#193252] md:mx-5">
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-full bg-[#e5f0ff] p-2 text-[#2472df]">
        {handover?.state === "CONFIRMED" ? <CheckCircle2 className="h-5 w-5" /> : handover?.state === "DISPUTED" ? <TriangleAlert className="h-5 w-5" /> : handover ? <Clock3 className="h-5 w-5" /> : <HandHeart className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          {handover?.state === "CONFIRMED" ? "ผู้รับยืนยันว่าได้รับของแล้ว"
            : handover?.state === "DISPUTED" ? "ผู้รับแจ้งว่ายังไม่ได้รับของ"
              : handover ? "ส่งมอบแล้ว · รอผู้รับยืนยัน"
                : "ขั้นตอนยืนยันการส่งคืน"}
        </div>
        <p className="mt-1 text-xs leading-5 text-[#617692]">
          {handover?.state === "CONFIRMED" ? "ประกาศนี้ปิดเป็นส่งคืนแล้ว"
            : handover?.state === "DISPUTED" ? "ประกาศยังไม่ปิด กรุณาพูดคุยและตรวจสอบการส่งมอบอีกครั้ง"
              : handover ? (isHolder ? "ระบบแจ้งอีกฝ่ายให้กลับมายืนยันการรับของแล้ว" : "กดได้รับของแล้วเฉพาะเมื่อของถึงมือคุณจริง ๆ")
                : isHolder ? "หลังส่งของให้ผู้รับแล้ว กดปุ่มด้านล่างเพื่อขอให้ผู้รับยืนยัน" : "เมื่อผู้ถือของแจ้งว่าส่งมอบแล้ว คุณจะยืนยันการรับของได้ที่นี่"}
        </p>
        {((!handover || handover.state === "DISPUTED") && isHolder) && <button type="button" disabled={submitting} onClick={start} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#2472df] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{handover ? "แจ้งส่งมอบอีกครั้ง" : "ส่งมอบของแล้ว"}</button>}
        {handover?.state === "WAITING_RECEIPT" && !isHolder && <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={submitting} onClick={() => respond(true)} className="rounded-xl bg-[#149466] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">ได้รับของแล้ว</button>
          <button type="button" disabled={submitting} onClick={() => respond(false)} className="rounded-xl border border-[#c8d7e9] bg-white px-4 py-2.5 text-xs font-semibold text-[#34506f] transition hover:bg-slate-50 disabled:opacity-50">ยังไม่ได้รับ</button>
        </div>}
      </div>
    </div>
  </div>;
}
