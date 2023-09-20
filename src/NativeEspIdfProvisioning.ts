import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type {
  ESPDevice,
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
  ): Promise<ESPDevice[]>;
  stopESPDevicesSearch(): void;
  createESPDevice(
    deviceName: string,
    transport: ESPTransport,
    security: ESPSecurity,
    proofOfPossesion?: string,
    softAPPassword?: string,
    username?: string
  ): Promise<ESPDevice>;
  connect(): Promise<ESPStatusResponse>;
  sendData(path: string, data: string): Promise<string>;
  isSessionEstablished(): boolean;
  getProofOfPossession(): Promise<string | undefined>;
  scanWifiList(): Promise<ESPWifiList>;
  disconnect(): void;
  provision(ssid: string, passphrase: string): Promise<ESPStatusResponse>;
  initialiseSession(sessionPath: string): Promise<ESPStatusResponse>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('EspIdfProvisioning');
