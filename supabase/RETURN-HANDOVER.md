# Return confirmation and reminders

The return workflow is intentionally separate from a chat message. The holder starts a handover in the conversation, and the recipient must confirm receipt before the post becomes `RETURNED`. A recipient can instead say the item has not arrived; the post remains open for another attempt.

## 1. Database

Run `return-handover-setup.sql` once in Supabase Dashboard → SQL Editor, after `all-in-one-setup.sql` and `chat-security-setup.sql`. Existing posts and conversations are preserved. The migration creates a private `return_handovers` table, two authenticated RPCs, notifications, and a trigger that rejects any direct `Post` update to `RETURNED` without recipient confirmation.

The app can then use the in-app handover buttons and notifications. Do not deploy the new frontend before running this SQL if users need the buttons immediately.

## 2. Transactional email (Resend)

This is **not** supplied by Supabase Auth SMTP. Create a Resend API key and verify the sending domain. In Supabase Dashboard → Edge Functions → Secrets, set:

- `RESEND_API_KEY`: Resend API key.
- `RETURN_EMAIL_FROM`: verified sender address, for example `PobJer <noreply@your-domain.example>`.
- `RETURN_SITE_URL`: public site origin, for example `https://findit-map.phuwanonkaewdang.workers.dev`.
- `RETURN_REMINDER_JOB_SECRET`: a long random value used only by the scheduler and Edge Function.

Deploy `supabase/functions/return-reminders/index.ts` as a function named `return-reminders`, with JWT verification disabled. The function still rejects requests without the private `x-return-job-secret` header. Never put the Resend key, Supabase secret key, or job secret in a `VITE_` variable or in Git.

For example, with the Supabase CLI linked to this project:

```bash
supabase functions deploy return-reminders --no-verify-jwt
```

## 3. Schedule email checks

In the SQL Editor, create three Vault secrets as shown in `return-email-cron.sql`: `return_project_url`, `return_publishable_key`, and `return_job_secret`. The last value must match `RETURN_REMINDER_JOB_SECRET`. Then run `return-email-cron.sql`.

The scheduled function checks every five minutes. It sends an initial email to the recipient while confirmation is pending, then reminders after 24 and 72 hours if there is still no response. It does not close the post automatically. A link opens `/messages/<conversation_id>`; login returns to that conversation. Email delivery attempts are idempotent per handover attempt and reminder stage.

Use a transactional provider only after confirming its sending-domain and quota settings. If email is not configured, the in-app notification and confirmation flow still work; scheduled emails do not.
