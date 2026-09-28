import { getEmergencyProtocol } from "../engine/emergency.protocols";
import { executeActuatorAction } from "./actuator.service";
import {
  EmergencyType,
  RiskResult,
  DeviceStatus,
} from "../types/lifeline.types";

export interface EmergencyResult {
  triggered: boolean;
  eventType?: EmergencyType;
  actions: string[];
  deviceStatus?: DeviceStatus;
}

export function handleEmergency(
  deviceId: string,
  risk: RiskResult
): EmergencyResult {

  if (
    risk.severity !== "CRITICAL" ||
    !risk.eventType
  ) {
    return {
      triggered: false,
      actions: [],
    };
  }

  const eventType = risk.eventType;

  console.log(
    `🚨 EMERGENCY DETECTED: ${eventType} | ${deviceId}`
  );

  const actions = getEmergencyProtocol(eventType);

  let deviceStatus: DeviceStatus | undefined;

  for (const action of actions) {
    deviceStatus = executeActuatorAction(
      deviceId,
      action
    );
  }

  return {
    triggered: true,
    eventType,
    actions,
    deviceStatus,
  };
}
