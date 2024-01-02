export enum ESPTransport {
  ble = 'ble',
  softap = 'softap',
}

export enum ESPSecurity {
  unsecure = 0,
  secure = 1,
  secure2 = 2,
}

export enum ESPWifiAuthMode {
  open = 0,
  wep = 1,
  wpa2Enterprise = 2,
  wpa2Psk = 3,
  wpaPsk = 4,
  wpaWpa2Psk = 5,
  wpa3Psk = 6,
  wpa2Wpa3Psk = 7,
}

export interface ESPDeviceInterface {
  name: string;
  security: ESPSecurity;
  transport: ESPTransport;
  connected?: boolean;
  username?: string;
  versionInfo?: { [key: string]: any }[];
  capabilities?: string[];
  advertisementData?: { [key: string]: any }[];
}

export interface ESPWifiList {
  ssid: string;
  rssi: number;
  auth: ESPWifiAuthMode;
  bssid?: string;
  channel?: number;
}

export interface ESPStatusResponse {
  status: string;
}
