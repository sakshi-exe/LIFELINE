import express from "express";
import emergencyRoutes from "./routes/emergency.routes";
import sensorRoutes from "./routes/sensor.routes";
import statusRoutes from "./routes/status.routes";
import realtimeRoutes from "./routes/realtime.routes";
import { supabase } from "./config/supabase";
import { startRealtimeBridge } from "./services/realtime.service";

const app = express();
const PORT = 5050;

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const { error } = await supabase
      .from("sensor_readings")
      .select("id", { head: true, count: "exact" });

    if (error) throw error;

    return res.json({
      success: true,
      service: "LIFELINE backend",
      status: "healthy",
      database: "connected",
    });
  } catch {
    return res.status(503).json({
      success: false,
      service: "LIFELINE backend",
      status: "degraded",
      database: "unavailable",
    });
  }
});

app.use("/api/v1/sensors", sensorRoutes);
app.use("/api/v1/events", emergencyRoutes);
app.use("/api/v1/device-status", statusRoutes);
app.use("/api/v1/realtime", realtimeRoutes);

startRealtimeBridge();

// Listen on all network interfaces so ESP32/other LAN devices can connect
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚨 LIFELINE backend running on http://0.0.0.0:${PORT}`);
});