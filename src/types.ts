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

  connect(
    proofOfPossession: string | null,
    softAPPassword: string | null,
    username: string | null
  ): Promise<void>;
  sendData(path: string, data: string): Promise<string>;
  scanWifiList(): Promise<ESPWifiList[]>;
  disconnect(): void;
  provision(ssid: string, passphrase: string): Promise<ESPStatusResponse>;
  getProofOfPossession(): Promise<string | undefined>;
  setProofOfPossession(proofOfPossession: string): Promise<this>;
  getUsername(): Promise<string | undefined>;
  setUsername(username: string): Promise<this>;
  getDeviceName(): Promise<string | undefined>;
  setDeviceName(deviceName: string): Promise<this>;
  getPrimaryServiceUuid(): Promise<string | undefined>;
  setPrimaryServiceUuid(primaryServiceUuid: string): Promise<this>;
  getSecurityType(): Promise<ESPSecurity | undefined>;
  setSecurityType(securityType: ESPSecurity): Promise<this>;
  getTransportType(): Promise<ESPTransport | undefined>;
  getVersionInfo(): Promise<{ [key: string]: any }[] | undefined>;
  getDeviceCapabilities(): Promise<string[] | undefined>;
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
