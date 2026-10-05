import { requireSupabase } from "@/api/supabaseClient";

const BUCKET = "chat-attachments";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export function validateChatFile(file) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("รองรับเฉพาะรูป JPG, PNG, WebP และไฟล์ PDF");
  if (file.size > MAX_BYTES) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
}

export async function uploadChatFile(conversationId, userId, file) {
  validateChatFile(file);
  const suffix = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
  const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${suffix}`;
  const { error } = await requireSupabase().storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getChatFileUrl(path) {
  const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
