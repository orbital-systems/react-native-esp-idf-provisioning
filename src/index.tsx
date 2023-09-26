import { NativeModules, Platform } from 'react-native';
import { Buffer } from 'buffer';
import type {
  ESPDeviceInterface,
  ESPWifiList,
  ESPSecurity,
  ESPTransport,
  ESPStatusResponse,
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

export class ESPDevice implements ESPDeviceInterface {
  name: string;
  transport: ESPTransport;
  security: ESPSecurity;
  connected: boolean = false;
  capabilities?: string[];
  versionInfo?: { [key: string]: any }[];
  advertisementData?: { [key: string]: any }[];
  address?: string;
  primaryServiceUuid?: string;

  constructor({
    name,
    transport,
    security,
    address,
    primaryServiceUuid,
  }: ESPDeviceInterface) {
    this.name = name;
    this.transport = transport;
    this.security = security;
    this.address = address;
    this.primaryServiceUuid = primaryServiceUuid;
  }

  async connect(
    proofOfPossesion: string | null = null,
    softAPPassword: string | null = null,
    username: string | null = null
  ): Promise<void> {
    const data = await EspIdfProvisioning.createESPDevice(
      this.name,
      this.transport,
      this.security,
      this.address,
      this.primaryServiceUuid,
      proofOfPossesion,
      softAPPassword,
      username
    );

    const response = await EspIdfProvisioning.connect(this.name);

    this.connected = true;
    this.capabilities = data.capabilities;
    this.versionInfo = data.versionInfo;
    this.advertisementData = data.advertisementData;

    return response;
  }

  sendData(path: string, data: string): Promise<string> {
    const base64Data = Buffer.from(path).toString('base64');
    console.info(`Sending data to ${this.name}: ${base64Data}`);
    return EspIdfProvisioning.sendData(this.name, base64Data, data).then(
      (responseData: string) =>
        Buffer.from(responseData, 'base64').toString('utf8')
    );
  }

  isSessionEstablished(): boolean {
    return EspIdfProvisioning.isSessionEstablished(this.name);
  }

  getProofOfPossession(): string | undefined {
    return EspIdfProvisioning.getProofOfPossession(this.name);
  }

  scanWifiList(): ESPWifiList[] {
    return EspIdfProvisioning.scanWifiList(this.name);
  }

  disconnect(): void {
    this.connected = false;
    return EspIdfProvisioning.disconnect(this.name);
  }

  provision(ssid: string, passphrase: string): Promise<ESPStatusResponse> {
    return EspIdfProvisioning.provision(this.name, ssid, passphrase);
  }

  initialiseSession(sessionPath?: string): Promise<ESPStatusResponse> {
    return EspIdfProvisioning.initialiseSession(this.name, sessionPath);
  }
}

export async function searchESPDevices(
  devicePrefix: string,
  transport: ESPTransport,
  security: ESPSecurity
): Promise<ESPDevice[]> {
  const espDevices = await EspIdfProvisioning.searchESPDevices(
    devicePrefix,
    transport,
    security
  );

  return espDevices?.map(
    (espDevice: ESPDeviceInterface) => new ESPDevice(espDevice)
  );
}

export function stopESPDevicesSearch(): void {
  return EspIdfProvisioning.stopESPDevicesSearch();
}
