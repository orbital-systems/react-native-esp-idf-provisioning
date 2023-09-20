# react-native-esp-idf-provisioning

Android (not yet) and iOS wrapper for ESP IDF provisioning.

## Installation

```sh
npm install @orbital-systems/react-native-esp-idf-provisioning
```

## Enums

```ts
enum ESPTransport {
  ble = 'ble',
  softap = 'softap',
}

enum ESPSecurity {
  unsecure = 0,
  secure = 1,
  secure2 = 2,
}

enum ESPWifiAuthMode {
  UNRECOGNIZED = 0,
  open = 1,
  wep = 2,
  wpa2Enterprise = 3,
  wpa2Psk = 4,
  wpaPsk = 5,
  wpaWpa2Psk = 6,
}

interface ESPDevice {
  name: string;
  advertisementData: { [key: string]: any }[];
  capabilities: string[];
  security: ESPSecurity;
  transport: ESPTransport;
  username?: string;
  versionInfo: { [key: string]: any }[];
}

interface ESPWifiList {
  ssid: string;
  bssid: string;
  auth: ESPWifiAuthMode;
  channel: number;
}

interface ESPStatusResponse {
  status: string;
}
```

## Functions

I deliberately skipped the scanQRCode functions for this first release but might want to add those as well for full public API compatibility.

```ts
// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L97
searchESPDevices(
  devicePrefix: string,
  transport: ESPTransport,
  security: ESPSecurity
): Promise<ESPDevice[]>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L123
stopESPDevicesSearch(): void;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L319
createESPDevice(
  deviceName: string,
  transport: ESPTransport,
  security: ESPSecurity,
  proofOfPossesion?: string,
  softAPPassword?: string,
  username?: string
): Promise<ESPDevice>;
```

```ts
// These methods require calling `createESPDevice`.
// Might want to bridge the ESPDevice class instead of keeping it in global scope?

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L164
connect(): Promise<ESPStatusResponse>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L249
// Important: the bridge function takes data from react-native as a base64 encoded string, decodes it and sends it to the device.
// The response is also base64 encoded data
sendData(path: string, data: string): Promise<string>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L260
isSessionEstablished(): boolean;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L76
getProofOfPossession(): Promise<string | undefined>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L422
scanWifiList(): Promise<ESPWifiList>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L407
disconnect(): void;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L325
provision(ssid: string, passphrase: string): Promise<ESPStatusResponse>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L444
initialiseSession(sessionPath: string): Promise<ESPStatusResponse>;
```

## Permissions

- Since iOS 13, apps that want to access SSID (Wi-Fi network name) are required to have the location permission. Add key `NSLocationWhenInUseUsageDescription` in Info.plist with proper description. This permission is required to verify iOS device is currently connected with the SoftAP.

- Since iOS 14, apps that communicate over local network are required to have the local network permission. Add key `NSLocalNetworkUsageDescription` in Info.plist with proper description. This permission is required to send/receive provisioning data with the SoftAP devices.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
