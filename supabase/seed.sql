insert into device_status (
    device_id,
    gas_valve,
    fan,
    power_isolation,
    door,
    alarm
)
values (
    'LIFELINE-001',
    false,
    false,
    false,
    false,
    false
)
on conflict (device_id) do nothing;