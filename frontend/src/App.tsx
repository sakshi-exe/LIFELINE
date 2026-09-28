import { useEffect, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  CircleGauge,
  Flame,
  Gauge,
  Home,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Thermometer,
  Waves,
  Wind,
  Zap,
  DoorOpen,
  Power,
  RefreshCw,
} from "lucide-react";

import {
  EmergencyEvent,
  EventAction,
  SensorRisk,
  checkBackendHealth,
  getActiveEmergency,
  getDeviceStatus,
  getEmergencyEvents,
  getEventActions,
  getSensorData,
  getSensorHistory,
  SensorReading,
  StoredDeviceStatus,
  resolveEmergency,
  sendSensorData,
  triggerManualEmergency,
} from "./services/api";
import { connectRealtime, RealtimeConnectionState } from "./services/realtime";

type SensorCard = {
  label: string;
  value: string;
  unit: string;
  status: string;
  icon: typeof Wind;
  level: number;
  danger?: boolean;
  warning?: boolean;
  active?: boolean;
};

type ActionItem = {
  number: string;
  label: string;
  status: string;
  executedAt: string;
  icon: typeof LockKeyhole;
};

const simulationScenarios = [
  { name: "NORMAL", description: "All monitored readings remain within normal ranges.", payload: { gas: 10, temperature: 28, humidity: 40, flame: false, motion: false, water: 5 } },
  { name: "GAS LEAK", description: "High gas reading with elevated temperature.", payload: { gas: 80, temperature: 45, humidity: 35, flame: false, motion: true, water: 5 } },
  { name: "FIRE", description: "Flame detected with high temperature.", payload: { gas: 20, temperature: 70, humidity: 30, flame: true, motion: true, water: 5 } },
  { name: "WATER LEAK", description: "Water hazard plus moderate readings to cross the critical score threshold.", payload: { gas: 30, temperature: 35, humidity: 50, flame: false, motion: false, water: 80 } },
  { name: "INTRUSION", description: "Motion detected while other hazard sensors remain normal.", payload: { gas: 10, temperature: 28, humidity: 40, flame: false, motion: true, water: 5 } },
] as const;

function getLastSimulationReadingId(): string | null {
  try {
    return localStorage.getItem("lifeline:last-simulation-reading");
  } catch {
    return null;
  }
}

function App() {
  const deviceId = "LIFELINE-001";
  const [sensorData, setSensorData] =
    useState<SensorReading | null>(null);
  const [sensorRisk, setSensorRisk] = useState<SensorRisk | null>(null);
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);
  const [deviceStatus, setDeviceStatus] =
    useState<StoredDeviceStatus | null>(null);
  const [eventActions, setEventActions] =
    useState<EventAction[]>([]);
  const [sensorHistory, setSensorHistory] =
    useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [backendState, setBackendState] = useState<"checking" | "online" | "degraded" | "offline">("checking");
  const [realtimeState, setRealtimeState] = useState<RealtimeConnectionState>("CONNECTING");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeView, setActiveView] = useState<"dashboard" | "events">("dashboard");
  const [manualPending, setManualPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resolvePending, setResolvePending] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState("ALL");
  const [selectedEventStatus, setSelectedEventStatus] = useState("ALL");
  const [simulationPending, setSimulationPending] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const simulatedReadingId = useRef<string | null>(getLastSimulationReadingId());
  const [simulatedReadings, setSimulatedReadings] = useState(false);
  const refreshNow = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let realtimeRefreshTimer: ReturnType<typeof setTimeout> | undefined;
    let realtimeVerificationTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    let refreshing = false;
    let refreshAgain = false;

    const refresh = async (): Promise<void> => {
      if (refreshing) {
        refreshAgain = true;
        return;
      }
      refreshing = true;
      const sensorRequest = getSensorData(deviceId, controller.signal);
      const backgroundRequest = Promise.allSettled([
        checkBackendHealth(controller.signal),
        getEmergencyEvents(deviceId, 20, controller.signal),
        getActiveEmergency(deviceId, controller.signal),
        getDeviceStatus(deviceId, controller.signal),
        getSensorHistory(deviceId, 30, controller.signal),
      ]);

      try {
        const sensor = await sensorRequest;
        if (mounted && !controller.signal.aborted) {
          setSensorData(sensor.data);
          setSensorRisk(sensor.risk);
          setSimulatedReadings(sensor.data.id === simulatedReadingId.current);
          setError(null);
          setLastUpdated(new Date());
          setLoading(false);
        }
      } catch (sensorFailure) {
        if (mounted && !controller.signal.aborted) {
          setError(sensorFailure instanceof Error ? sensorFailure.message : "Sensor API unavailable");
          setLoading(false);
        }
      }

      const [health, eventList, active, status, history] = await backgroundRequest;
      if (mounted && !controller.signal.aborted) {
        if (health.status === "fulfilled") {
          setBackendState(health.value.status === "healthy" ? "online" : "degraded");
        } else {
          setBackendState("offline");
        }
        if (eventList.status === "fulfilled" && active.status === "fulfilled") {
          setEvents(eventList.value);
          setActiveEvent(active.value);
          setEventError(null);
          const actionEvent = active.value ?? eventList.value[0] ?? null;
          if (actionEvent) {
            try {
              setEventActions(await getEventActions(actionEvent.id, controller.signal));
            } catch (actionFailure) {
              setEventError(actionFailure instanceof Error ? actionFailure.message : "Event actions unavailable");
            }
          } else {
            setEventActions([]);
          }
        } else {
          const failure = eventList.status === "rejected" ? eventList.reason : active.status === "rejected" ? active.reason : null;
          setEventError(failure instanceof Error ? failure.message : "Emergency event API unavailable");
        }
        if (status.status === "fulfilled") setDeviceStatus(status.value);
        if (history.status === "fulfilled") setSensorHistory([...history.value].reverse());
      }

      refreshing = false;
      if (mounted) {
        if (refreshAgain) {
          refreshAgain = false;
          timer = setTimeout(() => void refresh(), 0);
        } else {
          timer = setTimeout(() => void refresh(), 3000);
        }
      }
    };

    refreshNow.current = refresh;
    void refresh();

    const disconnectRealtime = connectRealtime({
      deviceId,
      onStateChange: (state) => {
        setRealtimeState(state);
        if (state === "CONNECTED" && realtimeVerificationTimer) {
          clearTimeout(realtimeVerificationTimer);
          realtimeVerificationTimer = undefined;
        }
      },
      onChange: () => {
        if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
        realtimeRefreshTimer = setTimeout(() => {
          if (timer) clearTimeout(timer);
          void refresh();
        }, 100);
      },
    });
    realtimeVerificationTimer = setTimeout(() => {
      if (mounted) setRealtimeState((state) => state === "CONNECTING" ? "DEGRADED" : state);
    }, 10000);

    return () => {
      mounted = false;
      controller.abort();
      disconnectRealtime();
      refreshNow.current = async () => {};
      if (timer) clearTimeout(timer);
      if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
      if (realtimeVerificationTimer) clearTimeout(realtimeVerificationTimer);
    };
  }, [deviceId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edf3f8]">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 shadow-lg">
            <ShieldCheck className="h-7 w-7 animate-pulse text-cyan-300" />
          </div>

          <p className="mt-5 text-sm font-bold text-slate-700">
            Connecting to LIFELINE...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Reading emergency sensors
          </p>
        </div>
      </div>
    );
  }

  if (!sensorData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#edf3f8] px-6">
        <div className="max-w-md rounded-[24px] border border-red-200 bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>

          <h1 className="mt-5 text-lg font-bold text-slate-800">
            {backendState === "offline" ? "SYSTEM OFFLINE" : "LIFELINE DATA UNAVAILABLE"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error || "Waiting for the first sensor reading."}
          </p>

          <button
            onClick={() => void refreshNow.current()}
            className="mt-6 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            RETRY CONNECTION
          </button>
        </div>
      </div>
    );
  }

  const risk = sensorRisk ?? { score: 0, severity: "NORMAL" as const };
  const eventType = activeEvent?.event_type;
  const severity = activeEvent?.severity ?? "NORMAL";
  const isEmergency = activeEvent !== null;
  const systemState = backendState === "offline"
    ? "SYSTEM OFFLINE"
    : backendState === "degraded" || Boolean(error || eventError) || realtimeState === "DEGRADED" || realtimeState === "DISCONNECTED"
      ? "SYSTEM DEGRADED"
      : backendState === "online"
        ? "SYSTEM ONLINE"
        : "CHECKING SYSTEM";
  const realtimeLabel = backendState === "offline"
    ? "REALTIME DISCONNECTED"
    : realtimeState === "CONNECTED"
      ? "REALTIME CONNECTED"
      : realtimeState === "CONNECTING"
        ? "REALTIME CONNECTING · POLLING ACTIVE"
        : "POLLING FALLBACK";

  const eventTitle = isEmergency && eventType
    ? ({
        GAS_LEAK: "Gas Leak Detected",
        FIRE: "Fire Detected",
        WATER_LEAK: "Water Leak Detected",
        INTRUSION: "Intrusion Detected",
        MANUAL_EMERGENCY: "Manual Emergency",
      } as Record<string, string>)[eventType]
    : "No Active Emergency";

  const eventDescription = !isEmergency
    ? "No active emergency is recorded. Current sensor risk is assessed separately below."
    : eventType === "GAS_LEAK"
    ? "Gas concentration crossed the critical threshold. LIFELINE initiated the recorded safety protocol."
    : eventType === "FIRE"
      ? "Flame or high temperature triggered the fire emergency protocol."
      : eventType === "WATER_LEAK"
        ? "Water level crossed the critical threshold."
        : eventType === "INTRUSION"
          ? "The intrusion protocol was triggered for this device."
          : eventType === "MANUAL_EMERGENCY"
            ? "A manual emergency was raised and recorded for this device."
            : severity === "WARNING"
              ? "One or more sensor readings require attention."
              : "All monitored environmental conditions are currently within safe limits.";

  const sensors: SensorCard[] = [
    {
      label: "Gas Level",
      value: String(sensorData.gas),
      unit: "%",
      status:
        sensorData.gas >= 60
          ? "CRITICAL"
          : sensorData.gas >= 30
            ? "WARNING"
            : "NORMAL",
      icon: Wind,
      level: Math.min(sensorData.gas, 100),
      danger: sensorData.gas >= 60,
      warning:
        sensorData.gas >= 30 &&
        sensorData.gas < 60,
    },

    {
      label: "Temperature",
      value: String(sensorData.temperature),
      unit: "°C",
      status:
        sensorData.temperature >= 50
          ? "CRITICAL"
          : sensorData.temperature >= 35
            ? "WARNING"
            : "NORMAL",
      icon: Thermometer,
      level: Math.min(
        sensorData.temperature * 2,
        100
      ),
      danger:
        sensorData.temperature >= 50,
      warning:
        sensorData.temperature >= 35 &&
        sensorData.temperature < 50,
    },

    {
      label: "Humidity",
      value: String(sensorData.humidity),
      unit: "%",
      status:
        sensorData.humidity >= 80
          ? "WARNING"
          : "NORMAL",
      icon: Waves,
      level: Math.min(sensorData.humidity, 100),
      warning: sensorData.humidity >= 80,
    },

    {
      label: "Flame",
      value: sensorData.flame
        ? "DETECTED"
        : "SAFE",
      unit: "",
      status: sensorData.flame
        ? "CRITICAL"
        : "NORMAL",
      icon: Flame,
      level: sensorData.flame ? 100 : 8,
      danger: sensorData.flame,
    },

    {
      label: "Motion",
      value: sensorData.motion
        ? "DETECTED"
        : "CLEAR",
      unit: "",
      status: sensorData.motion
        ? "ACTIVE"
        : "NORMAL",
      icon: Activity,
      level: sensorData.motion ? 55 : 8,
      active: sensorData.motion,
    },

    {
      label: "Water",
      value: String(sensorData.water),
      unit: "%",
      status:
        sensorData.water >= 60
          ? "CRITICAL"
          : sensorData.water >= 30
            ? "WARNING"
            : "NORMAL",
      icon: Waves,
      level: Math.min(sensorData.water, 100),
      danger: sensorData.water >= 60,
      warning:
        sensorData.water >= 30 &&
        sensorData.water < 60,
    },
  ];

  const actions: ActionItem[] = eventActions.map((action, index) => ({
    number: String(index + 1).padStart(2, "0"),
    label: action.action.replaceAll("_", " "),
    status: action.status,
    executedAt: action.executed_at,
    icon: action.action.includes("FAN")
      ? Wind
      : action.action.includes("POWER")
        ? Power
        : action.action.includes("DOOR")
          ? DoorOpen
          : action.action.includes("ALARM")
            ? Bell
            : LockKeyhole,
  }));

  const completedActions = actions.filter(
    (action) => action.status === "EXECUTED"
  ).length;
  const actuatorItems = [
    { label: "Gas valve", value: deviceStatus ? deviceStatus.gas_valve ? "OPEN" : "CLOSED" : "NO DATA", icon: LockKeyhole },
    { label: "Exhaust fan", value: deviceStatus ? deviceStatus.fan ? "ON" : "OFF" : "NO DATA", icon: Wind },
    { label: "Power", value: deviceStatus ? deviceStatus.power_isolation ? "ISOLATED" : "NORMAL" : "NO DATA", icon: Power },
    { label: "Door", value: deviceStatus ? deviceStatus.door ? "UNLOCKED" : "LOCKED" : "NO DATA", icon: DoorOpen },
    { label: "Alarm", value: deviceStatus ? deviceStatus.alarm ? "ON" : "OFF" : "NO DATA", icon: Bell },
  ];
  const filteredEvents = [...events]
    .sort((left, right) => Date.parse(right.triggered_at) - Date.parse(left.triggered_at))
    .filter((event) => selectedEventType === "ALL" || event.event_type === selectedEventType)
    .filter((event) => selectedEventStatus === "ALL" || event.status === selectedEventStatus);

  return (
    <div className="min-h-screen bg-[#edf3f8] text-[#172033]">

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-cyan-300/20 blur-[100px]" />
        <div className="absolute right-[-160px] top-[20%] h-[420px] w-[420px] rounded-full bg-violet-300/15 blur-[110px]" />
        <div className="absolute bottom-[-200px] left-[35%] h-[400px] w-[400px] rounded-full bg-blue-300/10 blur-[100px]" />
      </div>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] border-r border-slate-200/80 bg-white/80 backdrop-blur-2xl lg:flex lg:flex-col">

        <div className="flex h-[82px] items-center gap-3 border-b border-slate-200/70 px-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 shadow-lg shadow-slate-900/10">
            <ShieldCheck className="h-5 w-5 text-cyan-300" />
            <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-white" />
          </div>

          <div>
            <div className="font-[Space_Grotesk] text-[18px] font-bold tracking-[0.12em] text-slate-950">
              LIFE<span className="text-cyan-500">LINE</span>
            </div>

            <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Emergency Autopilot
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-7">
          <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Control Center
          </div>

          <div className="space-y-1.5">
            <NavItem icon={Home} label="Dashboard" active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} />
            <NavItem icon={Bell} label="Emergency Events" active={activeView === "events"} onClick={() => setActiveView("events")} />
            <NavItem icon={Gauge} label="Sensors" />
            <NavItem icon={Zap} label="Actuators" />
          </div>

          <div className="mt-9 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Autopilot
              </span>

              <span className={`flex items-center gap-1.5 text-[9px] font-bold ${backendState === "offline" ? "text-red-600" : backendState === "degraded" || error || eventError ? "text-amber-600" : isEmergency ? "text-red-600" : "text-emerald-600"}`}>
                <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${backendState === "offline" ? "bg-red-500" : backendState === "degraded" || error || eventError ? "bg-amber-500" : isEmergency ? "bg-red-500" : "bg-emerald-500"}`} />
                {backendState === "offline" ? "OFFLINE" : backendState === "degraded" || error || eventError ? "DEGRADED" : isEmergency ? "ACTIVE" : "MONITORING"}
              </span>
            </div>

            <div className="mt-3 text-[11px] leading-5 text-slate-500">
              Prototype response is recording simulated actuator states only.
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200/70 p-5">
          <div className="mb-3 text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Connected Device
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-xs font-semibold text-slate-700">
                LIFELINE-001
              </div>

              <div className="mt-1 text-[9px] text-slate-400">
                Smart Home Node
              </div>
            </div>

            <span className={`flex items-center gap-1.5 text-[9px] font-bold ${backendState === "offline" ? "text-red-600" : backendState === "degraded" || error ? "text-amber-600" : "text-emerald-600"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${backendState === "offline" ? "bg-red-500" : backendState === "degraded" || error ? "bg-amber-500" : "bg-emerald-500"}`} />
              {backendState === "offline" ? "OFFLINE" : backendState === "degraded" || error ? "DEGRADED" : "ONLINE"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="relative lg:pl-[250px]">

        {/* Header */}
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/70 bg-white/75 px-5 backdrop-blur-2xl sm:px-8">

          <div className="flex items-center gap-4">
            <button className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm lg:hidden">
              <Menu className="h-5 w-5" />
            </button>

            <div>
              <div className="font-[Space_Grotesk] text-sm font-bold tracking-tight text-slate-800">
                Emergency Control Center
              </div>

              <div className="mt-1 flex items-center gap-2 text-[9px] text-slate-400">
                <span className="font-mono">
                  LIFELINE-001
                </span>

                <span>•</span>

                <span>Smart Home</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:block">
              <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">
                Last Update
              </div>

              <div className="mt-0.5 font-mono text-[10px] text-slate-600">
                {lastUpdated?.toLocaleTimeString() ?? new Date(sensorData.created_at).toLocaleTimeString()}
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-full border px-3.5 py-2 shadow-sm ${backendState === "offline" ? "border-red-200 bg-red-50" : systemState === "SYSTEM ONLINE" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${backendState === "offline" ? "bg-red-500" : systemState === "SYSTEM ONLINE" ? "bg-emerald-500" : "bg-amber-500"}`} />

              <span className={`text-[9px] font-bold tracking-[0.1em] ${backendState === "offline" ? "text-red-700" : systemState === "SYSTEM ONLINE" ? "text-emerald-700" : "text-amber-700"}`}>
                {systemState}
              </span>
            </div>
            <span aria-live="polite" className={`hidden text-[8px] font-bold tracking-[0.08em] sm:inline ${realtimeState === "CONNECTED" ? "text-emerald-700" : "text-slate-500"}`}>
              {realtimeLabel}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 sm:p-8">

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <RefreshCw className="h-4 w-4 shrink-0" />
              Showing the last successful readings. Refresh failed: {error}
            </div>
          )}
          {eventError && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              Emergency event data is stale: {eventError}
            </div>
          )}
          {notice && (
            <div className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs text-cyan-800">{notice}</div>
          )}

          <div className={activeView === "dashboard" ? "" : "hidden"}>

          {/* Emergency Hero */}
          <section
            className={`animate-fade-up relative overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] ${
              isEmergency
                ? "border-red-200 shadow-[0_18px_60px_rgba(239,68,68,0.08)]"
                : severity === "WARNING"
                  ? "border-amber-200"
                  : "border-emerald-200"
            }`}
          >

            <div
              className={`absolute right-0 top-0 h-full w-[40%] bg-gradient-to-l ${
                isEmergency
                  ? "from-red-50/80"
                  : severity === "WARNING"
                    ? "from-amber-50/80"
                    : "from-emerald-50/80"
              } to-transparent`}
            />

            <div
              className={`absolute right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full blur-3xl animate-pulse-soft ${
                isEmergency
                  ? "bg-red-200/30"
                  : severity === "WARNING"
                    ? "bg-amber-200/30"
                    : "bg-emerald-200/30"
              }`}
            />

            <div className="relative flex flex-col gap-7 p-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between">

              <div className="flex gap-4">

                <div
                  className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                    isEmergency
                      ? "bg-red-50 text-red-500 ring-red-100"
                      : severity === "WARNING"
                        ? "bg-amber-50 text-amber-500 ring-amber-100"
                        : "bg-emerald-50 text-emerald-500 ring-emerald-100"
                  }`}
                >
                  {isEmergency ? (
                    <AlertTriangle className="h-6 w-6 animate-alert" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>

                <div>

                  <div className="flex flex-wrap items-center gap-2">

                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-[0.22em] ${
                        isEmergency
                          ? "text-red-500"
                          : severity === "WARNING"
                            ? "text-amber-500"
                            : "text-emerald-600"
                      }`}
                    >
                      {isEmergency
                        ? "Critical Emergency"
                        : "No Active Emergency"}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[8px] font-bold tracking-wider ${
                        isEmergency
                          ? "bg-red-50 text-red-500"
                          : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {isEmergency
                        ? "ACTIVE"
                        : "NO ACTIVE EVENT"}
                    </span>

                    {isEmergency && (
                      <span className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[8px] font-bold tracking-wider text-cyan-600">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-500" />
                        AUTOPILOT ENGAGED
                      </span>
                    )}
                  </div>

                  <h1 className="mt-2 font-[Space_Grotesk] text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                    {eventTitle}
                  </h1>

                  <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
                    {eventDescription}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-4 border-t border-slate-100 pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">

                <Meta
                  label="EVENT TYPE"
                  value={eventType || "NONE"}
                  danger={isEmergency}
                />

                <Meta
                  label="DEVICE"
                  value={sensorData.device_id}
                />

                <Meta
                  label="STATUS"
                  value={
                    isEmergency
                      ? "ACTIVE"
                      : "NO ACTIVE EVENT"
                  }
                  danger={isEmergency}
                />

                <Meta
                  label="RESPONSE"
                  value={
                    isEmergency
                      ? "AUTOMATIC"
                      : "STANDBY"
                  }
                  success={!isEmergency}
                />

              </div>
            </div>
          </section>

          {activeEvent && (
            <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div>
                <div className="text-[10px] font-extrabold text-amber-800">ACTIVE EVENT {activeEvent.event_type}</div>
                <div className="mt-1 text-[9px] text-amber-700">Resolve only after the hazard has been addressed.</div>
              </div>
              <button
                type="button"
                disabled={resolvePending}
                onClick={async () => {
                  if (!window.confirm(`Resolve ${activeEvent.event_type} event ${activeEvent.id}?`)) return;
                  setResolvePending(true);
                  setNotice(null);
                  try {
                    await resolveEmergency(activeEvent.id);
                    setNotice(`${activeEvent.event_type} marked RESOLVED.`);
                    await refreshNow.current();
                  } catch (resolveError) {
                    setEventError(resolveError instanceof Error ? resolveError.message : "Could not resolve event");
                  } finally {
                    setResolvePending(false);
                  }
                }}
                className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-[9px] font-extrabold tracking-wider text-amber-800 hover:bg-amber-100 disabled:opacity-60"
              >
                {resolvePending ? "RESOLVING..." : "RESOLVE EMERGENCY"}
              </button>
            </section>
          )}

          <section className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/80 p-4">
            <div>
              <div className="text-xs font-extrabold tracking-wide text-red-700">MANUAL EMERGENCY</div>
              <div className="mt-1 text-[10px] text-red-600">Trigger the emergency protocol for {deviceId}.</div>
            </div>
            <button
              type="button"
              disabled={manualPending}
              onClick={async () => {
                if (!window.confirm(`Trigger a manual emergency for ${deviceId}?`)) return;
                setManualPending(true);
                setNotice(null);
                try {
                  await triggerManualEmergency(deviceId);
                  setNotice("Manual emergency recorded. The dashboard will refresh with the persisted response.");
                  await refreshNow.current();
                } catch (requestError) {
                  setError(requestError instanceof Error ? requestError.message : "Manual emergency failed");
                } finally {
                  setManualPending(false);
                }
              }}
              className="rounded-lg bg-red-600 px-4 py-2 text-[10px] font-extrabold tracking-wider text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
            >
              {manualPending ? "SENDING..." : "TRIGGER EMERGENCY"}
            </button>
          </section>

          {/* Risk + Protection */}
          <section className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]">

            {/* Risk */}
            <div className="animate-fade-up delay-100 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">

              <div className="flex items-start justify-between">

                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Current Risk
                  </div>

                  <div className="mt-1 font-[Space_Grotesk] text-base font-bold text-slate-800">
                    Risk Assessment
                  </div>
                </div>

                <div
                  className={`rounded-xl p-2 ${
                    isEmergency
                      ? "bg-red-50 text-red-500"
                      : risk.severity === "WARNING"
                        ? "bg-amber-50 text-amber-500"
                        : "bg-emerald-50 text-emerald-500"
                      }`}
                >
                  <CircleGauge className="h-4 w-4" />
                </div>

              </div>

              <div className="mt-5 flex justify-center">

                <div className="risk-gauge relative h-44 w-44">

                  <svg
                    className="h-full w-full -rotate-90"
                    viewBox="0 0 180 180"
                  >

                    <circle
                      cx="90"
                      cy="90"
                      r="76"
                      fill="none"
                      stroke="#edf1f5"
                      strokeWidth="10"
                    />

                    <circle
                      cx="90"
                      cy="90"
                      r="76"
                      fill="none"
                      stroke={
                        isEmergency
                          ? "#ef4444"
                          : risk.severity === "WARNING"
                            ? "#f59e0b"
                            : "#10b981"
                      }
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="477"
                      strokeDashoffset={
                        477 -
                        (477 * risk.score) /
                          100
                      }
                    />

                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">

                    <div className="font-[Space_Grotesk] text-6xl font-bold tracking-[-0.08em] text-slate-950">
                      {risk.score}
                    </div>

                    <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-400">
                      out of 100
                    </div>

                    <div
                      className={`mt-2 rounded-full px-2.5 py-1 text-[8px] font-extrabold tracking-[0.16em] ${
                        isEmergency
                          ? "bg-red-50 text-red-500"
                          : risk.severity === "WARNING"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      {risk.severity}
                    </div>

                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 border-t border-slate-100 pt-4 text-center">

                <RiskLevel
                  label="NORMAL"
                  value="0–30"
                  active={
                    risk.severity === "NORMAL"
                  }
                />

                <RiskLevel
                  label="WARNING"
                  value="31–60"
                  active={
                    risk.severity === "WARNING"
                  }
                />

                <RiskLevel
                  label="CRITICAL"
                  value="61–100"
                  active={
                    risk.severity === "CRITICAL"
                  }
                />

              </div>
            </div>

            {/* Protection */}
            <div className="animate-fade-up delay-150 rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">

              <div className="flex items-start justify-between">

                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    Protection Status
                  </div>

                  <div className="mt-1 font-[Space_Grotesk] text-base font-bold text-slate-800">
                    Autonomous Response
                  </div>
                </div>

                <div className="rounded-xl bg-cyan-50 p-2 text-cyan-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>

              </div>

              <div
                className={`mt-6 flex items-center gap-3 rounded-2xl border p-4 ${
                  isEmergency
                    ? "border-emerald-100 bg-gradient-to-r from-emerald-50 to-white"
                    : "border-slate-100 bg-slate-50"
                }`}
              >

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    isEmergency
                      ? "bg-emerald-100"
                      : "bg-slate-100"
                  }`}
                >
                  <ShieldCheck
                    className={`h-5 w-5 ${
                      isEmergency
                        ? "text-emerald-600"
                        : "text-slate-500"
                    }`}
                  />
                </div>

                <div className="flex-1">

                  <div
                    className={`text-xs font-extrabold ${
                      isEmergency
                        ? "text-emerald-700"
                        : "text-slate-600"
                    }`}
                  >
                    {isEmergency
                      ? "AUTOPILOT RESPONSE ACTIVE"
                      : "AUTOPILOT STANDBY"}
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400">
                    {isEmergency
                      ? "Emergency protocol executing automatically"
                      : "Monitoring environment continuously"}
                  </div>
                </div>

                <div className="hidden text-right sm:block">
                  <div className="font-[Space_Grotesk] text-lg font-extrabold text-emerald-600">
                    {completedActions}/{actions.length}
                  </div>

                  <div className="text-[8px] uppercase tracking-wider text-slate-400">
                    Actions
                  </div>
                </div>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">

                <StatusStat
                  label="Emergency"
                  value={
                    isEmergency
                      ? "ACTIVE"
                      : "SAFE"
                  }
                  danger={isEmergency}
                  success={!isEmergency}
                />

                <StatusStat
                  label="Protocol"
                  value={
                    eventType ||
                    "STANDBY"
                  }
                />

                <StatusStat
                  label="Response"
                  value={
                    isEmergency
                      ? "AUTO"
                      : "MONITOR"
                  }
                  success={isEmergency && actions.length > 0 && completedActions === actions.length}
                />

                <StatusStat
                  label="Actions"
                  value={`${completedActions} / ${actions.length}`}
                  cyan
                />

              </div>
            </div>
          </section>

          {/* Sensors */}
          <section className="mt-9">

            <div className="mb-4 flex items-end justify-between">

              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Live Telemetry
                </div>

                <h2 className="mt-1 font-[Space_Grotesk] text-lg font-bold tracking-tight text-slate-800">
                  Sensor Readings
                </h2>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[8px] font-bold tracking-wider text-slate-500 shadow-sm ring-1 ring-slate-200/70">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                {simulatedReadings ? "SIMULATED DATA" : error ? "STALE DATA" : "LIVE DATA"}
              </div>

            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

              {sensors.map(
                (sensor, index) => {
                  const Icon = sensor.icon;

                  return (
                    <div
                      key={sensor.label}
                      className={`animate-fade-up group rounded-[20px] border bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(15,23,42,0.08)] ${
                        sensor.danger
                          ? "border-red-200 hover:border-red-300"
                          : "border-slate-200/80 hover:border-cyan-200"
                      }`}
                      style={{
                        animationDelay: `${
                          200 + index * 70
                        }ms`,
                      }}
                    >

                      <div className="flex items-center justify-between">

                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                            sensor.danger
                              ? "bg-red-50 text-red-500"
                              : sensor.warning
                                ? "bg-amber-50 text-amber-500"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <span
                          className={`text-[8px] font-extrabold tracking-[0.15em] ${
                            sensor.danger
                              ? "text-red-500"
                              : sensor.warning
                                ? "text-amber-500"
                                : sensor.active
                                  ? "text-cyan-600"
                                  : "text-emerald-600"
                          }`}
                        >
                          {sensor.status}
                        </span>

                      </div>

                      <div className="mt-5 text-[10px] font-medium text-slate-400">
                        {sensor.label}
                      </div>

                      <div className="mt-1 flex items-baseline gap-1">

                        <span className="font-[JetBrains_Mono] text-2xl font-bold tracking-[-0.04em] text-slate-900">
                          {sensor.value}
                        </span>

                        <span className="font-mono text-xs font-medium text-slate-400">
                          {sensor.unit}
                        </span>

                      </div>

                      <div className="mt-4 flex h-5 items-end gap-[3px]">

                        {[20, 40, 60, 80, 100].map(
                          (level) => (
                            <span
                              key={level}
                              className={`signal-bar flex-1 rounded-sm ${
                                level <=
                                sensor.level
                                  ? sensor.danger
                                    ? "bg-red-400"
                                    : sensor.warning
                                      ? "bg-amber-400"
                                      : "bg-cyan-400"
                                  : "bg-slate-100"
                              }`}
                              style={{
                                height: `${Math.max(
                                  20,
                                  level / 1.5
                                )}%`,
                                animationDelay: `${
                                  index * 80
                                }ms`,
                              }}
                            />
                          )
                        )}

                      </div>
                    </div>
                  );
                }
              )}

            </div>
          </section>

          <section className="mt-9 rounded-[20px] border border-cyan-200 bg-cyan-50/70 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-[8px] font-extrabold tracking-[0.16em] text-cyan-800">
                  DEMO / SIMULATION
                </div>
                <h2 className="mt-3 font-[Space_Grotesk] text-base font-bold text-slate-900">Sensor Scenario Controls</h2>
                <p className="mt-1 text-[10px] leading-5 text-slate-500">Generate test sensor conditions through the same API used by LIFELINE hardware. Values are simulated, not live hardware telemetry.</p>
                <p className="mt-1 text-[9px] text-slate-500">Device: {deviceId} · POST /api/v1/sensors</p>
              </div>
              {simulationPending && <div className="text-[10px] font-bold text-cyan-800">Sending {simulationPending}...</div>}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {simulationScenarios.map((scenario) => (
                <div key={scenario.name} className="rounded-xl border border-cyan-100 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-extrabold text-slate-800">{scenario.name}</span>
                    <button
                      type="button"
                      disabled={simulationPending !== null}
                      onClick={async () => {
                        setSimulationPending(scenario.name);
                        setSimulationMessage(null);
                        try {
                          const result = await sendSensorData({ device_id: deviceId, ...scenario.payload });
                          const readingId = result.reading?.id ?? null;
                          simulatedReadingId.current = readingId;
                          let storageWarning = "";
                          try {
                            if (readingId) localStorage.setItem("lifeline:last-simulation-reading", readingId);
                          } catch {
                            storageWarning = " Simulation label is temporary because browser storage is unavailable.";
                          }
                          const eventName = result.event?.event_type ?? "no emergency event created";
                          const actionNames = result.actions?.map((action) => action.action).join(", ") || "no actions persisted";
                          setSimulationMessage(`${scenario.name} submitted. Backend risk: ${result.risk?.score ?? "unavailable"}/100 ${result.risk?.severity ?? ""}. Persisted event: ${eventName}. Actions: ${actionNames}.${storageWarning}`);
                          await refreshNow.current();
                        } catch (simulationError) {
                          setSimulationMessage(`${scenario.name} failed: ${simulationError instanceof Error ? simulationError.message : "Sensor POST failed"}`);
                        } finally {
                          setSimulationPending(null);
                        }
                      }}
                      className="rounded-md bg-slate-950 px-2.5 py-1.5 text-[8px] font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {simulationPending === scenario.name ? "SENDING" : "SEND"}
                    </button>
                  </div>
                  <div className="mt-2 text-[8px] leading-4 text-slate-500">
                    G {scenario.payload.gas} · T {scenario.payload.temperature} · H {scenario.payload.humidity} · F {String(scenario.payload.flame)} · M {String(scenario.payload.motion)} · W {scenario.payload.water}
                  </div>
                  <div className="mt-1 text-[8px] leading-4 text-slate-600">{scenario.description}</div>
                </div>
              ))}
            </div>
            {simulationMessage && (
              <div className={`mt-3 rounded-lg px-3 py-2 text-[10px] ${simulationMessage.includes("failed") ? "bg-red-50 text-red-700" : "bg-white text-slate-600"}`}>
                {simulationMessage}
              </div>
            )}
          </section>

          <section className="mt-9">
            <div className="mb-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Stored outputs</div>
              <h2 className="mt-1 font-[Space_Grotesk] text-lg font-bold text-slate-800">Actuator Status</h2>
              <p className="mt-1 text-[9px] text-slate-500">Prototype state only. No physical valve, fan, door, alarm, or power hardware is connected.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {actuatorItems.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><Icon className="h-4 w-4" /></span>
                  <span>
                    <span className="block text-[9px] text-slate-400">{label}</span>
                    <span className="mt-1 block font-mono text-xs font-bold text-slate-700">{value}</span>
                  </span>
                </div>
              ))}
            </div>
            {deviceStatus && <p className="mt-2 text-right text-[9px] text-slate-400">Updated {new Date(deviceStatus.updated_at).toLocaleString()}</p>}
          </section>

          <section className="mt-9">
            <div className="mb-4">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Recent telemetry</div>
              <h2 className="mt-1 font-[Space_Grotesk] text-lg font-bold text-slate-800">Sensor History</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <HistorySparkline label="Gas" unit="%" values={sensorHistory.map((reading) => reading.gas)} color="#ef4444" />
              <HistorySparkline label="Temperature" unit="°C" values={sensorHistory.map((reading) => reading.temperature)} color="#f59e0b" />
              <HistorySparkline label="Humidity" unit="%" values={sensorHistory.map((reading) => reading.humidity)} color="#0891b2" />
              <HistorySparkline label="Water" unit="%" values={sensorHistory.map((reading) => reading.water)} color="#2563eb" />
            </div>
          </section>

          {/* Autopilot */}
          <section className="mt-9 animate-fade-up delay-500">

            <div className="mb-4 flex items-end justify-between">

              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Emergency Autopilot
                </div>

                <h2 className="mt-1 font-[Space_Grotesk] text-lg font-bold tracking-tight text-slate-800">
                  Automated Safety Actions
                </h2>
              </div>

              {isEmergency && (
                <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-extrabold tracking-wider text-emerald-600 sm:flex">
                  <Check className="h-3 w-3" />
                  {completedActions} / {actions.length} EXECUTED
                </div>
              )}

            </div>

            <div className="relative rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-6">

              {actions.length > 0 && (
                <div className="absolute left-[39px] top-12 hidden h-[calc(100%-96px)] w-px bg-gradient-to-b from-cyan-200 via-emerald-200 to-emerald-100 sm:block" />
              )}

              {actions.length > 0 ? (
                <div className="space-y-2">

                  {actions.map(
                    (action, index) => {
                      const Icon = action.icon;

                      return (
                        <div
                          key={action.label}
                          className="autopilot-row group relative flex items-center gap-4 rounded-2xl p-3 transition-all duration-300 hover:bg-slate-50"
                          style={{
                            animationDelay: `${
                              600 +
                              index * 120
                            }ms`,
                          }}
                        >

                          <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${action.status === "EXECUTED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                            {action.status === "EXECUTED" ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          </div>

                          <div className="min-w-0 flex-1">

                            <div className="flex items-center gap-2">

                              <span className="font-mono text-[8px] font-bold text-slate-300">
                                {action.number}
                              </span>

                              <span className="text-xs font-bold text-slate-700">
                                {action.label}
                              </span>

                            </div>

                            <div className="mt-0.5 text-[9px] text-slate-400">
                              Executed {new Date(action.executedAt).toLocaleString()}
                            </div>

                          </div>

                          <div className="flex items-center gap-3">

                            <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 sm:flex">
                              <Icon className="h-3.5 w-3.5" />
                            </div>

                            <span className={`rounded-full px-3 py-1.5 font-mono text-[8px] font-bold tracking-wider ${action.status === "EXECUTED" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                              {action.status}
                            </span>

                            <ChevronRight className="hidden h-3.5 w-3.5 text-slate-300 sm:block" />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50">
                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                  </div>

                  <div className="mt-4 text-sm font-bold text-slate-700">
                    {activeEvent ? "No Actions Recorded" : "No Emergency Actions Required"}
                  </div>

                  <div className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                    {activeEvent ? "The active event has no persisted action records yet." : "LIFELINE is monitoring the environment for conditions that require an emergency response."}
                  </div>

                </div>
              )}

              {actions.length > 0 && (
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Response Status
                    </div>

                    <div className="mt-1 text-xs font-bold text-slate-700">
                      {completedActions} of {actions.length} recorded actions executed
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 ${completedActions === actions.length ? "bg-emerald-50" : "bg-amber-50"}`}>
                    {completedActions === actions.length ? <Check className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}

                    <span className={`text-[9px] font-extrabold tracking-wider ${completedActions === actions.length ? "text-emerald-700" : "text-amber-700"}`}>
                      {completedActions === actions.length ? "ACTIONS EXECUTED" : "ACTION IN PROGRESS"}
                    </span>
                  </div>

                </div>
              )}

            </div>
          </section>

          {/* Footer */}
          <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200/70 py-6 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:flex-row">
            <span>
              LIFELINE · Smart Home Emergency Autopilot
            </span>

            <span>
              Detect · Decide · Act · Protect
            </span>
          </footer>

          </div>

          {activeView === "events" && (
            <section className="animate-fade-up rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-7">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Incident archive</div>
                  <h1 className="mt-1 font-[Space_Grotesk] text-xl font-bold text-slate-900">Emergency Events</h1>
                </div>
                <div className="font-mono text-[10px] text-slate-500">{filteredEvents.length} RECORDS</div>
              </div>
              <div className="mb-4 flex flex-wrap gap-3">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Event type
                  <select value={selectedEventType} onChange={(event) => setSelectedEventType(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-700">
                    <option value="ALL">All types</option>
                    <option value="GAS_LEAK">Gas leak</option>
                    <option value="FIRE">Fire</option>
                    <option value="WATER_LEAK">Water leak</option>
                    <option value="INTRUSION">Intrusion</option>
                    <option value="MANUAL_EMERGENCY">Manual emergency</option>
                  </select>
                </label>
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  Status
                  <select value={selectedEventStatus} onChange={(event) => setSelectedEventStatus(event.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-medium normal-case tracking-normal text-slate-700">
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </label>
              </div>
              {filteredEvents.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No emergency events have been recorded for this device.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1050px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-[8px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        <th className="px-3 py-3">Event</th><th className="px-3 py-3">Risk</th><th className="px-3 py-3">Severity</th><th className="px-3 py-3">Device</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Response</th><th className="px-3 py-3">Actions</th><th className="px-3 py-3">Triggered</th><th className="px-3 py-3">Resolved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => (
                        <tr key={event.id} className="border-b border-slate-100 text-xs text-slate-700">
                          <td className="px-3 py-4 font-mono font-semibold">{event.event_type}</td>
                          <td className="px-3 py-4 font-mono">{event.risk_score}/100</td>
                          <td className="px-3 py-4">{event.severity}</td>
                          <td className="px-3 py-4 font-mono">{event.device_id}</td>
                          <td className="px-3 py-4">{event.status}</td>
                          <td className="px-3 py-4">{event.event_type === "MANUAL_EMERGENCY" ? "MANUAL" : "AUTOMATIC"}</td>
                          <td className="px-3 py-4 text-center">{event.action_count ?? "—"}</td>
                          <td className="px-3 py-4">{new Date(event.triggered_at).toLocaleString()}</td>
                          <td className="px-3 py-4">{event.resolved_at ? new Date(event.resolved_at).toLocaleString() : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

        </div>
      </main>
    </div>
  );
}

function HistorySparkline({
  label,
  unit,
  values,
  color,
}: {
  label: string;
  unit: string;
  values: number[];
  color: string;
}) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = maximum - minimum || 1;
  const points = values.map((value, index) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * 300 : 150;
    const y = 62 - ((value - minimum) / spread) * 50;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-bold text-slate-600">{label}</span>
        <span className="font-mono text-[10px] text-slate-500">
          {values.length ? `${values.at(-1)} ${unit}` : "NO DATA"}
        </span>
      </div>
      {values.length ? (
        <svg className="mt-3 h-16 w-full overflow-visible" viewBox="0 0 300 72" preserveAspectRatio="none" role="img" aria-label={`${label} recent history`}>
          <line x1="0" y1="63" x2="300" y2="63" stroke="#e2e8f0" strokeWidth="1" />
          <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <div className="mt-3 flex h-16 items-center justify-center text-[10px] text-slate-400">No sensor history available</div>
      )}
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function Meta({
  label,
  value,
  danger = false,
  success = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
}) {
  return (
    <div>
      <div className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-[10px] font-semibold ${
          danger
            ? "text-red-500"
            : success
              ? "text-emerald-600"
              : "text-slate-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function RiskLevel({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div>
      <div
        className={`text-[8px] font-bold tracking-wider ${
          active
            ? label === "CRITICAL"
              ? "text-red-500"
              : label === "WARNING"
                ? "text-amber-500"
                : "text-emerald-600"
            : "text-slate-400"
        }`}
      >
        {label}
      </div>

      <div className="mt-1 text-[9px] text-slate-400">
        {value}
      </div>
    </div>
  );
}

function StatusStat({
  label,
  value,
  danger,
  success,
  cyan,
}: {
  label: string;
  value: string;
  danger?: boolean;
  success?: boolean;
  cyan?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">

      <div className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>

      <div
        className={`mt-1.5 font-[Space_Grotesk] text-xs font-bold ${
          danger
            ? "text-red-500"
            : success
              ? "text-emerald-600"
              : cyan
                ? "text-cyan-600"
                : "text-slate-700"
        }`}
      >
        {value}
      </div>

    </div>
  );
}

export default App;