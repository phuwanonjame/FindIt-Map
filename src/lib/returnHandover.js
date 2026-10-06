import { requireSupabase } from "@/api/supabaseClient";

export async function getReturnHandover(conversationId) {
  const { data, error } = await requireSupabase()
    .from("return_handovers")
    .select("*")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startReturnHandover(conversationId) {
  const { data, error } = await requireSupabase().rpc("start_return_handover", {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
  return data;
}

export async function respondReturnHandover(conversationId, received) {
  const { data, error } = await requireSupabase().rpc("respond_return_handover", {
    p_conversation_id: conversationId,
    p_received: received,
  });
  if (error) throw error;
  return data;
}
