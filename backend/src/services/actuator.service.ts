import { DeviceStatus, EmergencyType } from "../types/lifeline.types";

const deviceStates = new Map<string, DeviceStatus>();

function getDefaultStatus(deviceId: string): DeviceStatus {
  return {
    device_id: deviceId,
    gas_valve: true,
    fan: false,
    power_isolation: false,
    door: false,
    alarm: false,
  };
}

export function getDeviceStatus(deviceId: string): DeviceStatus {
  if (!deviceStates.has(deviceId)) {
    deviceStates.set(deviceId, getDefaultStatus(deviceId));
  }

  return deviceStates.get(deviceId)!;
}

export function executeActuatorAction(
  deviceId: string,
  action: string
): DeviceStatus {
  const status = getDeviceStatus(deviceId);

  switch (action) {
    case "CLOSE_GAS_VALVE":
      status.gas_valve = false;
      break;

    case "EXHAUST_FAN_ON":
      status.fan = true;
      break;

    case "POWER_ISOLATION_ON":
      status.power_isolation = true;
      break;

    case "DOOR_UNLOCK":
      status.door = true;
      break;

    case "ALARM_ON":
      status.alarm = true;
      break;

    default:
      console.log(`⚠️ Unknown actuator action: ${action}`);
  }

  console.log(`⚙️ ${deviceId}: ${action}`);

  return status;
}
