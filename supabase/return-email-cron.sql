-- Optional: run after deploying the return-reminders Edge Function and setting
-- RETURN_REMINDER_JOB_SECRET, RESEND_API_KEY, RETURN_EMAIL_FROM, RETURN_SITE_URL.
-- Create Vault secrets named return_project_url, return_publishable_key,
-- return_job_secret first. The job secret must equal RETURN_REMINDER_JOB_SECRET.
-- Example (replace placeholders in the SQL Editor; never commit actual values):
-- select vault.create_secret('https://YOUR_PROJECT.supabase.co', 'return_project_url');
-- select vault.create_secret('YOUR_PUBLISHABLE_KEY', 'return_publishable_key');
-- select vault.create_secret('YOUR_RANDOM_JOB_SECRET', 'return_job_secret');

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'pobjer-return-reminders',
  '*/5 * * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'return_project_url') || '/functions/v1/return-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'return_publishable_key'),
        'x-return-job-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'return_job_secret')
      ),
      body := '{}'::jsonb
    );
  $$
);
