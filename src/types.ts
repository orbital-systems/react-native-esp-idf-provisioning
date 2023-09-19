export enum Transport {
  ble = 'ble',
  softap = 'softap',
}

export enum Security {
  unsecure = 0,
  secure = 1,
  secure2 = 2,
}

export enum WifiAuthMode {
  UNRECOGNIZED = 0,
  open = 1,
  wep = 2,
  wpa2Enterprise = 3,
  wpa2Psk = 4,
  wpaPsk = 5,
  wpaWpa2Psk = 6,
}

export interface ESPDevice {
  name: string;
  advertisementData: { [key: string]: any }[];
  capabilities: string[];
  security: Security;
  transport: Transport;
  username?: string;
  versionInfo: { [key: string]: any }[];
}

export interface ESPWifiList {
  ssid: string;
  bssid: string;
  auth: WifiAuthMode;
  channel: number;
}
