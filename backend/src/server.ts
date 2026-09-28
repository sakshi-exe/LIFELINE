import express from "express";
import emergencyRoutes from "./routes/emergency.routes";
import sensorRoutes from "./routes/sensor.routes";
import statusRoutes from "./routes/status.routes";

const app = express();
const PORT = 5050;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "LIFELINE backend",
    status: "healthy",
  });
});

app.use("/api/v1/sensors", sensorRoutes);
app.use("/api/v1/events", emergencyRoutes);
app.use("/api/v1/device-status", statusRoutes);

app.listen(PORT, () => {
  console.log(`🚨 LIFELINE backend running on http://localhost:${PORT}`);
});
