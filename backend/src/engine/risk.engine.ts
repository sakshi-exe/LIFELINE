import {
  SensorData,
  RiskResult,
} from "../types/lifeline.types";

export function calculateRisk(data: SensorData): RiskResult {
  let score = 0;
  let eventType: RiskResult["eventType"];

  // GAS LEAK
  if (data.gas >= 60) {
    score += 60;
    eventType = "GAS_LEAK";
  } else if (data.gas >= 30) {
    score += 25;
  }

  // TEMPERATURE
  if (data.temperature >= 50) {
    score += 30;
    eventType = eventType || "FIRE";
  } else if (data.temperature >= 35) {
    score += 15;
  }

  // FLAME — immediate fire emergency
  if (data.flame) {
    score += 61;
    eventType = "FIRE";
  }

  if (data.motion && !eventType) {
    eventType = "INTRUSION";
    score += 61;
  }

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
