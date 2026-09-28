create extension if not exists "uuid-ossp";

-- =========================================
-- SENSOR READINGS
-- =========================================

create table if not exists sensor_readings (
    id uuid primary key default uuid_generate_v4(),

    device_id text not null,

    gas numeric default 0,
    temperature numeric default 0,
    humidity numeric default 0,

    flame boolean default false,
    motion boolean default false,

    water numeric default 0,

    created_at timestamptz default now()
);


-- =========================================
-- EMERGENCY EVENTS
-- =========================================

create table if not exists emergency_events (
    id uuid primary key default uuid_generate_v4(),

    device_id text not null,

    event_type text not null,
    severity text not null,

    risk_score integer check (
        risk_score >= 0 and risk_score <= 100
    ),

    triggered_at timestamptz default now(),
    resolved_at timestamptz,

    status text default 'ACTIVE'
);


-- =========================================
-- DEVICE STATUS
-- =========================================

create table if not exists device_status (
    id uuid primary key default uuid_generate_v4(),

    device_id text unique not null,

    gas_valve boolean default false,
    fan boolean default false,
    power_isolation boolean default false,
    door boolean default false,
    alarm boolean default false,

    updated_at timestamptz default now()
);


-- =========================================
-- EVENT ACTIONS
-- =========================================

create table if not exists event_actions (
    id uuid primary key default uuid_generate_v4(),

    event_id uuid references emergency_events(id)
        on delete cascade,

    action text not null,
    status text default 'EXECUTED',

    executed_at timestamptz default now()
);


-- =========================================
-- INDEXES
-- =========================================

create index if not exists idx_sensor_device_time
on sensor_readings(device_id, created_at desc);

create index if not exists idx_events_device_time
on emergency_events(device_id, triggered_at desc);

create index if not exists idx_actions_event
on event_actions(event_id);