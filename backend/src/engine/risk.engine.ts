import {
  SensorData,
  RiskResult,
} from "../types/lifeline.types";

export function calculateRisk(data: SensorData): RiskResult {
  let score = 0;
  let eventType: RiskResult["eventType"];

  // Gas
  if (data.gas >= 60) {
    score += 35;
    eventType = "GAS_LEAK";
  } else if (data.gas >= 30) {
    score += 20;
  }

  // Temperature
  if (data.temperature >= 50) {
    score += 25;
    eventType = eventType || "FIRE";
  } else if (data.temperature >= 35) {
    score += 15;
  }

  // Flame
  if (data.flame) {
    score += 40;
    eventType = "FIRE";
  }

  // Water
  if (data.water >= 60) {
    score += 30;
    eventType = eventType || "WATER_LEAK";
  } else if (data.water >= 30) {
    score += 15;
  }

  // Cap score
  score = Math.min(score, 100);

  let severity: RiskResult["severity"];

  if (score >= 61) {
    severity = "CRITICAL";
  } else if (score >= 31) {
    severity = "WARNING";
  } else {
    severity = "NORMAL";
  }

  return {
    score,
    severity,
    eventType,
  };
}