import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';
import type { Security, Transport } from './types';

export interface Spec extends TurboModule {
  searchESPDevices(
    devicePrefix: string,
    transport: Transport,
    security: Security
  ): Promise<any>;
  stopESPDevicesSearch(): void;
  createESPDevice(
    deviceName: string,
    transport: Transport,
    security: Security,
    proofOfPossesion?: string,
    softAPPassword?: string,
    username?: string
  ): Promise<any>;
  connect(): Promise<any>;
  sendData(path: string, data: string): Promise<any>;
  isSessionEstablished(): boolean;
  getProofOfPossession(): Promise<any>;
  scanWifiList(): Promise<any>;
  disconnect(): void;
  provision(ssid: string, passphrase: string): Promise<any>;
  initialiseSession(sessionPath: string): Promise<any>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('EspIdfProvisioning');
