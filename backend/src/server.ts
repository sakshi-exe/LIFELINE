import express from "express";
import sensorRoutes from "./routes/sensor.routes";

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

app.listen(PORT, () => {
  console.log(`🚨 LIFELINE backend running on http://localhost:${PORT}`);
});
