import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface ESPDeviceInterface {
  name: string;
  security: number;
  transport: string;
  connected?: boolean;
  username?: string;
  versionInfo?: { [key: string]: any }[];
  capabilities?: string[];
  advertisementData?: { [key: string]: any }[];
}

export interface ESPWifiList {
  ssid: string;
  rssi: number;
  auth: number;
  bssid?: string;
  channel?: number;
}

export interface ESPStatusResponse {
  status: string;
}

export interface Spec extends TurboModule {
  searchESPDevices(
    devicePrefix: string,
    transport: string,
    security: number
  ): Promise<ESPDeviceInterface[]>;
  stopESPDevicesSearch(): void;
  createESPDevice(
    deviceName: string,
    transport: string,
    security: number,
    proofOfPossession?: string,
    softAPPassword?: string,
    username?: string
  ): Promise<ESPDeviceInterface>;
  connect(deviceName: string): Promise<ESPStatusResponse>;
  sendData(deviceName: string, path: string, data: string): Promise<string>;
  scanWifiList(deviceName: string): Promise<ESPWifiList>;
  disconnect(deviceName: string): void;
  provision(
    deviceName: string,
    ssid: string,
    passphrase: string
  ): Promise<ESPStatusResponse>;
  getProofOfPossession(deviceName: string): Promise<string | undefined>;
  setProofOfPossession(
    deviceName: string,
    proofOfPossession: string
  ): Promise<string | undefined>;
  getUsername(deviceName: string): Promise<string | undefined>;
  setUsername(
    deviceName: string,
    username: string
  ): Promise<string | undefined>;
  getDeviceName(deviceName: string): Promise<string | undefined>;
  setDeviceName(
    deviceName: string,
    newDeviceName: string
  ): Promise<string | undefined>;
  getPrimaryServiceUuid(deviceName: string): Promise<string | undefined>;
  setPrimaryServiceUuid(
    deviceName: string,
    primaryServiceUuid: string
  ): Promise<string | undefined>;
  getSecurityType(deviceName: string): Promise<number | undefined>;
  setSecurityType(
    deviceName: string,
    securityType: number
  ): Promise<number | undefined>;
  getTransportType(deviceName: string): Promise<string | undefined>;
  getVersionInfo(
    deviceName: string
  ): Promise<{ [key: string]: any }[] | undefined>;
  getDeviceCapabilities(deviceName: string): Promise<string[] | undefined>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('EspIdfProvisioning');
