import { NativeModules, Platform } from 'react-native';
import type {
  ESPDevice,
  ESPWifiList,
  ESPSecurity,
  ESPTransport,
} from './types';

const LINKING_ERROR =
  `The package 'react-native-esp-idf-provisioning' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

// @ts-expect-error
const isTurboModuleEnabled = global.__turboModuleProxy != null;

const EspIdfProvisioningModule = isTurboModuleEnabled
  ? require('./NativeEspIdfProvisioning').default
  : NativeModules.EspIdfProvisioning;

const EspIdfProvisioning = EspIdfProvisioningModule
  ? EspIdfProvisioningModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function searchESPDevices(
  devicePrefix: string,
  transport: ESPTransport,
  security: ESPSecurity
): Promise<ESPDevice[]> {
  return EspIdfProvisioning.searchESPDevices(devicePrefix, transport, security);
}

export function stopESPDevicesSearch(): void {
  return EspIdfProvisioning.stopESPDevicesSearch();
}

export function createESPDevice(
  deviceName: string,
  transport: ESPTransport,
  security: ESPSecurity,
  proofOfPossesion: string | null = null,
  softAPPassword: string | null = null,
  username: string | null = null
): Promise<ESPDevice> {
  return EspIdfProvisioning.createESPDevice(
    deviceName,
    transport,
    security,
    proofOfPossesion,
    softAPPassword,
    username
  );
}

export function connect(): Promise<{ status: 'connected' }> {
  return EspIdfProvisioning.connect();
}

export function sendData(
  path: string,
  data: string
): Promise<{ status: 'success' }> {
  return EspIdfProvisioning.sendData(path, data);
}

export function isSessionEstablished(): boolean {
  return EspIdfProvisioning.isSessionEstablished();
}

export function getProofOfPossession(): string | undefined {
  return EspIdfProvisioning.getProofOfPossession();
}

export function scanWifiList(): ESPWifiList[] {
  return EspIdfProvisioning.scanWifiList();
}

export function disconnect(): void {
  return EspIdfProvisioning.disconnect();
}

export function provision(
  ssid: string,
  passphrase: string
): Promise<{ status: 'success' }> {
  return EspIdfProvisioning.provision(ssid, passphrase);
}

export function initialiseSession(
  sessionPath?: string
): Promise<{ status: 'connected' }> {
  return EspIdfProvisioning.initialiseSession(sessionPath);
}
