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
} from "lucide-react";

const sensors = [
  {
    label: "Gas Level",
    value: "80",
    unit: "%",
    status: "CRITICAL",
    icon: Wind,
    level: 80,
    danger: true,
  },
  {
    label: "Temperature",
    value: "45",
    unit: "°C",
    status: "WARNING",
    icon: Thermometer,
    level: 65,
    warning: true,
  },
  {
    label: "Humidity",
    value: "35",
    unit: "%",
    status: "NORMAL",
    icon: Waves,
    level: 35,
  },
  {
    label: "Flame",
    value: "SAFE",
    unit: "",
    status: "NORMAL",
    icon: Flame,
    level: 8,
  },
  {
    label: "Motion",
    value: "DETECTED",
    unit: "",
    status: "ACTIVE",
    icon: Activity,
    level: 55,
    active: true,
  },
];

const actions = [
  {
    number: "01",
    label: "Gas Valve",
    state: "CLOSED",
    detail: "Gas supply isolated",
    icon: LockKeyhole,
  },
  {
    number: "02",
    label: "Exhaust Fan",
    state: "ON",
    detail: "Ventilation activated",
    icon: Wind,
  },
  {
    number: "03",
    label: "Power Isolation",
    state: "ON",
    detail: "Electrical supply isolated",
    icon: Zap,
  },
  {
    number: "04",
    label: "Emergency Door",
    state: "UNLOCKED",
    detail: "Exit access enabled",
    icon: LockKeyhole,
  },
  {
    number: "05",
    label: "Alarm",
    state: "ON",
    detail: "Emergency alarm active",
    icon: Bell,
  },
];

function App() {
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
            <NavItem icon={Home} label="Dashboard" active />
            <NavItem icon={Bell} label="Emergency Events" />
            <NavItem icon={Gauge} label="Sensors" />
            <NavItem icon={Zap} label="Actuators" />
          </div>

          <div className="mt-9 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Autopilot
              </span>

              <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                READY
              </span>
            </div>

            <div className="mt-3 text-[11px] leading-5 text-slate-500">
              Autonomous emergency response is enabled and monitoring the home.
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

            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              ONLINE
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
                <span className="font-mono">LIFELINE-001</span>
                <span>•</span>
                <span>Smart Home</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:block">
              <div className="text-[8px] font-bold uppercase tracking-[0.15em] text-slate-400">
                System Time
              </div>

              <div className="mt-0.5 font-mono text-[10px] text-slate-600">
                LIVE
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

              <span className="text-[9px] font-bold tracking-[0.1em] text-emerald-700">
                SYSTEM ONLINE
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
          {/* Emergency Hero */}
          <section className="animate-fade-up relative overflow-hidden rounded-[24px] border border-red-200 bg-white shadow-[0_18px_60px_rgba(239,68,68,0.08)]">
            <div className="absolute right-0 top-0 h-full w-[40%] bg-gradient-to-l from-red-50/80 to-transparent" />

            <div className="absolute right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-red-200/30 blur-3xl animate-pulse-soft" />

            <div className="relative flex flex-col gap-7 p-6 sm:p-7 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-4">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
                  <AlertTriangle className="h-6 w-6 animate-alert" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-red-500">
                      Critical Emergency
                    </span>

                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-[8px] font-bold tracking-wider text-red-500">
                      ACTIVE
                    </span>

                    <span className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[8px] font-bold tracking-wider text-cyan-600">
                      <span className="h-1 w-1 animate-pulse rounded-full bg-cyan-500" />
                      AUTOPILOT ENGAGED
                    </span>
                  </div>

                  <h1 className="mt-2 font-[Space_Grotesk] text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
                    Gas Leak Detected
                  </h1>

                  <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500">
                    Gas concentration crossed the critical threshold.
                    LIFELINE automatically initiated the emergency safety
                    protocol.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-10 gap-y-4 border-t border-slate-100 pt-5 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                <Meta label="EVENT TYPE" value="GAS_LEAK" danger />
                <Meta label="DEVICE" value="LIFELINE-001" />
                <Meta label="STATUS" value="ACTIVE" danger />
                <Meta label="RESPONSE" value="AUTOMATIC" success />
              </div>
            </div>
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

                <div className="rounded-xl bg-red-50 p-2 text-red-500">
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
                      stroke="#ef4444"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="477"
                      strokeDashoffset="119"
                      className="risk-progress"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="font-[Space_Grotesk] text-6xl font-bold tracking-[-0.08em] text-slate-950">
                      75
                    </div>

                    <div className="mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-400">
                      out of 100
                    </div>

                    <div className="mt-2 rounded-full bg-red-50 px-2.5 py-1 text-[8px] font-extrabold tracking-[0.16em] text-red-500">
                      CRITICAL
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 border-t border-slate-100 pt-4 text-center">
                <RiskLevel label="NORMAL" value="0–30" />
                <RiskLevel label="WARNING" value="31–60" />
                <RiskLevel label="CRITICAL" value="61–100" active />
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

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>

                <div className="flex-1">
                  <div className="text-xs font-extrabold text-emerald-700">
                    AUTOPILOT RESPONSE ACTIVE
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400">
                    Emergency protocol executing automatically
                  </div>
                </div>

                <div className="hidden text-right sm:block">
                  <div className="font-[Space_Grotesk] text-lg font-extrabold text-emerald-600">
                    5/5
                  </div>

                  <div className="text-[8px] uppercase tracking-wider text-slate-400">
                    Actions
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusStat label="Emergency" value="ACTIVE" danger />
                <StatusStat label="Protocol" value="GAS LEAK" />
                <StatusStat label="Response" value="AUTO" success />
                <StatusStat label="Actions" value="5 / 5" cyan />
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
                LIVE DATA
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {sensors.map((sensor, index) => {
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
                      animationDelay: `${200 + index * 70}ms`,
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
                      {[20, 40, 60, 80, 100].map((level) => (
                        <span
                          key={level}
                          className={`signal-bar flex-1 rounded-sm ${
                            level <= sensor.level
                              ? sensor.danger
                                ? "bg-red-400"
                                : sensor.warning
                                  ? "bg-amber-400"
                                  : "bg-cyan-400"
                              : "bg-slate-100"
                          }`}
                          style={{
                            height: `${Math.max(20, level / 1.5)}%`,
                            animationDelay: `${index * 80}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
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

              <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[8px] font-extrabold tracking-wider text-emerald-600 sm:flex">
                <Check className="h-3 w-3" />
                5 / 5 EXECUTED
              </div>
            </div>

            <div className="relative rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="absolute left-[39px] top-12 hidden h-[calc(100%-96px)] w-px bg-gradient-to-b from-cyan-200 via-emerald-200 to-emerald-100 sm:block" />

              <div className="space-y-2">
                {actions.map((action, index) => {
                  const Icon = action.icon;

                  return (
                    <div
                      key={action.label}
                      className="autopilot-row group relative flex items-center gap-4 rounded-2xl p-3 transition-all duration-300 hover:bg-slate-50"
                      style={{
                        animationDelay: `${600 + index * 120}ms`,
                      }}
                    >
                      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-white">
                        <Check className="h-3.5 w-3.5" />
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
                          {action.detail}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 sm:flex">
                          <Icon className="h-3.5 w-3.5" />
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-mono text-[8px] font-bold tracking-wider text-emerald-600">
                          {action.state}
                        </span>

                        <ChevronRight className="hidden h-3.5 w-3.5 text-slate-300 sm:block" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Response Status
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-700">
                    All safety actions completed successfully
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5">
                  <Check className="h-4 w-4 text-emerald-600" />

                  <span className="text-[9px] font-extrabold tracking-wider text-emerald-700">
                    AUTOPILOT SUCCESS
                  </span>
                </div>
              </div>
            </div>
          </section>

          <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200/70 py-6 text-[8px] font-semibold uppercase tracking-[0.2em] text-slate-400 sm:flex-row">
            <span>LIFELINE · Smart Home Emergency Autopilot</span>
            <span>Detect · Decide · Act · Protect</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-semibold transition-all duration-200 ${
        active
          ? "bg-slate-950 text-white shadow-lg shadow-slate-900/10"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
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
          active ? "text-red-500" : "text-slate-400"
        }`}
      >
        {label}
      </div>

      <div className="mt-1 text-[9px] text-slate-400">{value}</div>
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
