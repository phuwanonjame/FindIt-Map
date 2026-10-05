import { requireSupabase } from "./supabaseClient";

const table = "app_records";
const toRecord = (row) => ({ ...row.data, id: row.id, created_date: row.created_at, updated_date: row.updated_at, created_by_id: row.owner_id });
const fail = (error) => { if (error) throw error; };

const entity = (entityName) => ({
  async list(order, limit) {
    const client = requireSupabase();
    const descending = order?.startsWith("-") ?? true;
    const column = order?.replace(/^-/, "") === "updated_date" ? "updated_at" : "created_at";
    let query = client.from(table).select("*").eq("entity", entityName).order(column, { ascending: !descending });
    if (limit) query = query.limit(limit);
    const { data, error } = await query; fail(error);
    return data.map(toRecord);
  },
  async filter(query) {
    const client = requireSupabase();
    let request = client.from(table).select("*").eq("entity", entityName);
    if (query && Object.keys(query).length) request = request.contains("data", query);
    const { data, error } = await request.order("created_at", { ascending: false });
    fail(error);
    return data.map(toRecord);
  },
  async get(id) {
    const { data, error } = await requireSupabase().from(table).select("*").eq("entity", entityName).eq("id", id).single();
    fail(error); return toRecord(data);
  },
  async create(values) {
    const client = requireSupabase();
    const { data: auth, error: authError } = await client.auth.getUser(); fail(authError);
    const { data, error } = await client.from(table).insert({ entity: entityName, owner_id: auth.user?.id, data: values }).select().single();
    fail(error); return toRecord(data);
  },
  async update(id, values) {
    const previous = await this.get(id);
    const { data, error } = await requireSupabase().from(table).update({ data: { ...previous, ...values } }).eq("entity", entityName).eq("id", id).select().single();
    fail(error); return toRecord(data);
  },
  async delete(id) {
    const { error } = await requireSupabase().from(table).delete().eq("entity", entityName).eq("id", id);
    fail(error);
  },
});

const userFromAuth = (user) => user && ({
  id: user.id,
  email: user.email,
  full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0],
  role: user.app_metadata?.role || "user",
  ...user.user_metadata,
});

const auth = {
  async me() {
    // Reading the cached session is immediate and avoids blocking the entire UI
    // while a network request to Auth is pending during the initial page load.
    const { data, error } = await requireSupabase().auth.getSession();
    fail(error);
    if (!data.session?.user) {
      const authError = Object.assign(new Error("auth_required"), { status: 401 });
      throw authError;
    }
    return userFromAuth(data.session.user);
  },
  async register({ email, password, ...profile }) { const { data, error } = await requireSupabase().auth.signUp({ email, password, options: { data: profile } }); fail(error); return data; },
  async verifyOtp({ email, otpCode }) { const { data, error } = await requireSupabase().auth.verifyOtp({ email, token: otpCode, type: "email" }); fail(error); window.dispatchEvent(new Event("findme:auth-changed")); return { access_token: data.session?.access_token, user: userFromAuth(data.user) }; },
  async resendOtp(email) { const { error } = await requireSupabase().auth.resend({ type: "signup", email }); fail(error); },
  async loginViaEmailPassword(email, password) { const { data, error } = await requireSupabase().auth.signInWithPassword({ email, password }); fail(error); window.dispatchEvent(new Event("findme:auth-changed")); return userFromAuth(data.user); },
  async loginWithProvider(provider, redirectTo = window.location.origin) { const { error } = await requireSupabase().auth.signInWithOAuth({ provider, options: { redirectTo } }); fail(error); },
  setToken() {},
  async logout() { const { error } = await requireSupabase().auth.signOut(); fail(error); },
  redirectToLogin() { window.location.assign("/login"); },
  async resetPasswordRequest(email) { const { error } = await requireSupabase().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); fail(error); },
  async resetPassword({ newPassword }) { const { error } = await requireSupabase().auth.updateUser({ password: newPassword }); fail(error); },
};

const EntityNames = ["Post", "PostEvent", "Claim", "Conversation", "Message", "Notification", "SavedPost", "Review", "Report"];
export const base44 = {
  auth,
  app: { async getPublicSettings() { return {}; } },
  entities: Object.fromEntries(EntityNames.map((name) => [name, entity(name)])),
  integrations: { Core: { async UploadPrivateFile({ file }) {
    const client = requireSupabase();
    const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await client.storage.from("post-images").upload(path, file, { contentType: file.type, upsert: false }); fail(error);
    return { file_uri: client.storage.from("post-images").getPublicUrl(path).data.publicUrl };
  } } },
};
