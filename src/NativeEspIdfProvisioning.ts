import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

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

export interface Spec extends TurboModule {
  searchESPDevices(
    devicePrefix: string,
    transport: ESPTransport,
    security: ESPSecurity
  ): Promise<ESPDeviceInterface[]>;
  stopESPDevicesSearch(): void;

  createESPDevice(
    deviceName: string,
    transport: ESPTransport,
    security: ESPSecurity,
    proofOfPossesion?: string,
    softAPPassword?: string,
    username?: string
  ): Promise<ESPDeviceInterface>;
  connect(deviceName: string): Promise<ESPStatusResponse>;
  sendData(deviceName: string, path: string, data: string): Promise<string>;
  isSessionEstablished(deviceName: string): boolean;
  getProofOfPossession(deviceName: string): Promise<string | undefined>;
  scanWifiList(deviceName: string): Promise<ESPWifiList>;
  disconnect(deviceName: string): void;
  provision(
    deviceName: string,
    ssid: string,
    passphrase: string
  ): Promise<ESPStatusResponse>;
  initialiseSession(
    deviceName: string,
    sessionPath: string
  ): Promise<ESPStatusResponse>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('EspIdfProvisioning');
