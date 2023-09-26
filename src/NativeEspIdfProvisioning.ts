import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  ESPDeviceInterface,
  ESPSecurity,
  ESPStatusResponse,
  ESPTransport,
  ESPWifiList,
} from './types';

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
    address?: string,
    primaryServiceUuid?: string,
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
