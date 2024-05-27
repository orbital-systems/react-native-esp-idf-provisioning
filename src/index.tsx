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

  /**
   * Create a new ESPDevice instance.
   * @param name - The name of the device.
   * @param transport - The transport type to use for the device.
   * @param security - The security type to use for the device.
   */
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

  /**
   * Connect to the device.
   * @param proofOfPossession The proof of possession to use for the device.
   * @param softAPPassword The soft AP password to use for the device.
   * @param username The username to use for the device.
   * @returns A promise that resolves when the device is connected.
   */
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

    return response;
  }

  /**
   * Send data to the device.
   * @param path The path to send the data to.
   * @param data The data to send. The data should be a string. The data will be transferred with base64 encoding.
   * @returns A promise that resolves with the response data.
   */
  async sendData(path: string, data: string): Promise<string> {
    const base64Data = Buffer.from(data).toString('base64');
    return EspIdfProvisioning.sendData(this.name, path, base64Data).then(
      (returnData: string) => Buffer.from(returnData, 'base64').toString('utf8')
    );
  }

  /**
   * Scan for WiFi networks.
   * @returns A promise that resolves with the list of WiFi networks.
   */
  async scanWifiList(): Promise<ESPWifiList[]> {
    return EspIdfProvisioning.scanWifiList(this.name);
  }

  /**
   * Disconnect from the device.
   */
  disconnect(): void {
    return EspIdfProvisioning.disconnect(this.name);
  }

  /**
   * Provision the device with the given SSID and passphrase.
   * @param ssid The SSID to use for the device.
   * @param passphrase The passphrase to use for the device.
   * @returns A promise that resolves with the status response.
   */
  async provision(
    ssid: string,
    passphrase: string
  ): Promise<ESPStatusResponse> {
    return EspIdfProvisioning.provision(this.name, ssid, passphrase);
  }

  /**
   * Get the proof of possession for the device.
   * @returns A promise that resolves with the proof of possession.
   */
  async getProofOfPossession(): Promise<string | undefined> {
    return EspIdfProvisioning.getProofOfPossession(this.name);
  }

  /**
   * Set the proof of possession for the device.
   * @param proofOfPossession The proof of possession to set.
   * @returns A promise that resolves when the proof of possession is set.
   */
  async setProofOfPossession(proofOfPossession: string): Promise<this> {
    await EspIdfProvisioning.setProofOfPossession(this.name, proofOfPossession);
    return this;
  }

  /**
   * Get the username for the device.
   * @returns A promise that resolves with the username.
   */
  async getUsername(): Promise<string | undefined> {
    return EspIdfProvisioning.getUsername(this.name);
  }

  /**
   * Set the username for the device.
   * @param username The username to set.
   * @returns A promise that resolves when the username is set.
   */
  async setUsername(username: string): Promise<this> {
    await EspIdfProvisioning.setUsername(this.name, username);
    return this;
  }

  /**
   * Get the device name.
   * @returns A promise that resolves with the device name.
   */
  async getDeviceName(): Promise<string | undefined> {
    return EspIdfProvisioning.getDeviceName(this.name);
  }

  /**
   * Set the device name. On iOS this is a no-op because changing the device name is not supported.
   * @param deviceName The device name to set.
   * @returns A promise that resolves when the device name is set.
   */
  async setDeviceName(deviceName: string): Promise<this> {
    await EspIdfProvisioning.setDeviceName(this.name, deviceName);
    return this;
  }

  /**
   * Get the primary service UUID. On iOS this is a no-op because there is no primary service UUID.
   * @returns A promise that resolves with the primary service UUID.
   */
  async getPrimaryServiceUuid(): Promise<string | undefined> {
    return EspIdfProvisioning.getPrimaryServiceUuid(this.name);
  }

  /**
   * Set the primary service UUID. On iOS this is a no-op because there is no primary service UUID.
   * @param primaryServiceUuid The primary service UUID to set.
   * @returns A promise that resolves when the primary service UUID is set.
   */
  async setPrimaryServiceUuid(primaryServiceUuid: string): Promise<this> {
    await EspIdfProvisioning.setPrimaryServiceUuid(
      this.name,
      primaryServiceUuid
    );
    return this;
  }

  /**
   * Get the security type.
   * @returns A promise that resolves with the security type.
   */
  async getSecurityType(): Promise<ESPSecurity | undefined> {
    return EspIdfProvisioning.getSecurityType(this.name);
  }

  /**
   * Set the security type.
   * @param securityType The security type to set.
   * @returns A promise that resolves when the security type is set.
   */
  async setSecurityType(securityType: ESPSecurity): Promise<this> {
    await EspIdfProvisioning.setSecurityType(this.name, securityType);
    return this;
  }

  /**
   * Get the transport type.
   * @returns A promise that resolves with the transport type.
   */
  async getTransportType(): Promise<ESPTransport | undefined> {
    return EspIdfProvisioning.getTransportType(this.name);
  }

  /**
   * Get the version information.
   * @returns A promise that resolves with the version information.
   */
  async getVersionInfo(): Promise<{ [key: string]: any }[] | undefined> {
    return EspIdfProvisioning.getVersionInfo(this.name);
  }

  /**
   * Get the device capabilities.
   * @returns A promise that resolves with the device capabilities.
   */
  async getDeviceCapabilities(): Promise<string[] | undefined> {
    return EspIdfProvisioning.getDeviceCapabilities(this.name);
  }
}

export class ESPProvisionManager {
  /**
   * Search for ESP devices.
   * @param devicePrefix The prefix of the device name to search for.
   * @param transport The transport type to use for the device.
   * @param security The security type to use for the device.
   * @returns A promise that resolves with the list of ESP devices found.
   */
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

  /**
   * Stop searching for ESP devices.
   */
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
