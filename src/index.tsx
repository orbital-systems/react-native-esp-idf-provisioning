import { NativeModules, Platform } from 'react-native';
import type { Security, Transport } from './types';

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
  transport: Transport,
  security: Security
): Promise<any> {
  return EspIdfProvisioning.searchESPDevices(devicePrefix, transport, security);
}

export function stopESPDevicesSearch() {
  return EspIdfProvisioning.stopESPDevicesSearch();
}

export function createESPDevice(deviceName: string, transport: Transport) {
  return EspIdfProvisioning.createESPDevice(deviceName, transport);
}

export function connect() {
  return EspIdfProvisioning.connect();
}

export function sendData(path: string, data: string) {
  return EspIdfProvisioning.sendData(path, data);
}

export function isSessionEstablished() {
  return EspIdfProvisioning.isSessionEstablished();
}

export function getProofOfPossession() {
  return EspIdfProvisioning.getProofOfPossession();
}

export function disconnect() {
  return EspIdfProvisioning.disconnect();
}

export function provision(ssid: string, passphrase: string) {
  return EspIdfProvisioning.provision(ssid, passphrase);
}

export function initSession(sessionPath: string) {
  return EspIdfProvisioning.initSession(sessionPath);
}
