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
