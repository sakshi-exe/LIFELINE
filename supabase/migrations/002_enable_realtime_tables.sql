do $$
declare
    table_name text;
begin
    if not exists (
        select 1
        from pg_publication
        where pubname = 'supabase_realtime'
    ) then
        raise exception 'Supabase publication supabase_realtime is missing. Enable Realtime for this project before applying this migration.';
    end if;

    foreach table_name in array array[
        'sensor_readings',
        'emergency_events',
        'device_status',
        'event_actions'
    ] loop
        if not exists (
            select 1
            from pg_publication_tables
            where pubname = 'supabase_realtime'
              and schemaname = 'public'
              and tablename = table_name
        ) then
            execute format('alter publication supabase_realtime add table public.%I', table_name);
        end if;
    end loop;
end
$$;