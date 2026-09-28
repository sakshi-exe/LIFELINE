# Supabase setup

Apply migrations in order to the configured Supabase project. The Realtime migration adds only the existing public tables used by the dashboard to the `supabase_realtime` publication:

```sh
supabase db push
```

Alternatively, run `migrations/002_enable_realtime_tables.sql` in the Supabase SQL Editor after `001_initial_schema.sql`. It is idempotent and stops with an explicit error if the project's `supabase_realtime` publication does not exist. In that case, enable Database Realtime for the project, then rerun the migration.

After applying it, restart the backend and verify the dashboard status changes from `POLLING FALLBACK` to `REALTIME CONNECTED` after a database change. If not, leave polling enabled and check that `sensor_readings`, `emergency_events`, `device_status`, and `event_actions` appear under the publication's tables.

The service-role key remains backend-only. No Supabase credentials are required in the frontend; the browser receives change notifications from the backend SSE endpoint and reloads authoritative data through the backend API.
