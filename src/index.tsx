import { NativeModules, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { ESPSecurity, ESPTransport } from './types';
import type {
  ESPDeviceInterface,
  ESPWifiList,
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

  constructor({
    name,
    transport = ESPTransport.ble,
    security = ESPSecurity.secure2,
  }: {
    name: string;
    transport: ESPTransport;
    security: ESPSecurity;
  }) {
    this.name = name;
    this.transport = transport;
    this.security = security;
  }

  async connect(
    proofOfPossession: string | null = null,
    softAPPassword: string | null = null,
    username: string | null = null
  ): Promise<void> {
    await EspIdfProvisioning.createESPDevice(
      this.name,
      this.transport,
      this.security,
      proofOfPossession,
      softAPPassword,
      username
    );

    const response = await EspIdfProvisioning.connect(this.name);
    this.connected = true;

    return response;
  }

  async sendData(path: string, data: string): Promise<string> {
    const base64Data = Buffer.from(data).toString('base64');
    return EspIdfProvisioning.sendData(this.name, path, base64Data).then(
      (returnData: string) => Buffer.from(returnData, 'base64').toString('utf8')
    );
  }

  async scanWifiList(): Promise<ESPWifiList[]> {
    return EspIdfProvisioning.scanWifiList(this.name);
  }

  disconnect(): void {
    this.connected = false;
    return EspIdfProvisioning.disconnect(this.name);
  }

  async provision(
    ssid: string,
    passphrase: string
  ): Promise<ESPStatusResponse> {
    return EspIdfProvisioning.provision(this.name, ssid, passphrase);
  }

  async getProofOfPossession(): Promise<string | undefined> {
    return EspIdfProvisioning.getProofOfPossession(this.name);
  }

  async setProofOfPossession(proofOfPossession: string): Promise<this> {
    await EspIdfProvisioning.setProofOfPossession(this.name, proofOfPossession);
    return this;
  }

  async getUsername(): Promise<string | undefined> {
    return EspIdfProvisioning.getUsername(this.name);
  }

  async setUsername(username: string): Promise<this> {
    await EspIdfProvisioning.setUsername(this.name, username);
    return this;
  }

  async getDeviceName(): Promise<string | undefined> {
    return EspIdfProvisioning.getDeviceName(this.name);
  }

  async setDeviceName(deviceName: string): Promise<this> {
    await EspIdfProvisioning.setDeviceName(this.name, deviceName);
    return this;
  }

  async getPrimaryServiceUuid(): Promise<string | undefined> {
    return EspIdfProvisioning.getPrimaryServiceUuid(this.name);
  }

  async setPrimaryServiceUuid(primaryServiceUuid: string): Promise<this> {
    await EspIdfProvisioning.setPrimaryServiceUuid(
      this.name,
      primaryServiceUuid
    );
    return this;
  }

  async getSecurityType(): Promise<ESPSecurity | undefined> {
    return EspIdfProvisioning.getSecurityType(this.name);
  }

  async setSecurityType(securityType: ESPSecurity): Promise<this> {
    await EspIdfProvisioning.setSecurityType(this.name, securityType);
    return this;
  }

  async getTransportType(): Promise<ESPTransport | undefined> {
    return EspIdfProvisioning.getTransportType(this.name);
  }

  async getVersionInfo(): Promise<{ [key: string]: any }[] | undefined> {
    return EspIdfProvisioning.getVersionInfo(this.name);
  }

  async getDeviceCapabilities(): Promise<string[] | undefined> {
    return EspIdfProvisioning.getDeviceCapabilities(this.name);
  }
}

export class ESPProvisionManager {
  static async searchESPDevices(
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

  static stopESPDevicesSearch(): void {
    return EspIdfProvisioning.stopESPDevicesSearch();
  }
}

export { ESPSecurity, ESPTransport, ESPWifiAuthMode } from './types';
export type {
  ESPDeviceInterface,
  ESPWifiList,
  ESPStatusResponse,
} from './types';
