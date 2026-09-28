import { EmergencyType } from "../types/lifeline.types";

export function getEmergencyProtocol(
  eventType: EmergencyType
): string[] {
  switch (eventType) {
    case "GAS_LEAK":
      return [
        "CLOSE_GAS_VALVE",
        "EXHAUST_FAN_ON",
        "POWER_ISOLATION_ON",
        "DOOR_UNLOCK",
        "ALARM_ON",
      ];

    case "FIRE":
      return [
        "CLOSE_GAS_VALVE",
        "EXHAUST_FAN_ON",
        "POWER_ISOLATION_ON",
        "DOOR_UNLOCK",
        "ALARM_ON",
      ];

    case "WATER_LEAK":
      return [
        "POWER_ISOLATION_ON",
        "ALARM_ON",
      ];

    case "INTRUSION":
      return [
        "ALARM_ON",
      ];

    case "MANUAL_EMERGENCY":
      return [
        "DOOR_UNLOCK",
        "ALARM_ON",
      ];

    default:
      return [];
  }
}
