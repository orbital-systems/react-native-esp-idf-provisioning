# react-native-esp-idf-provisioning

Android (not yet) and iOS wrapper for ESP IDF provisioning.

## Installation

```sh
npm install @orbital-systems/react-native-esp-idf-provisioning
```

## Usage

```ts
import {
  searchESPDevices,
  ESPDevice,
  ESPTransport,
  ESPSecurity,
} from '@orbital-systems/react-native-esp-idf-provisioning';

// Method 1.
// Get devices...
const devices = searchESPDevices('prefix');
// ... and select device (using picklist, dropdown, w/e)
const device = devices[0];

// Method 2.
// If you know device name and transport/security settings, create a device class instance
const device = new ESPDevice({
  name: 'name',
  transport: ESPTransport.ble,
  security: ESPSecurity.secure2,
});

// Connect to device with proofOfPossesion
const proofOfPossesion = 'pop';
await device.connect(proofOfPosession);

// Get wifi list
const wifiList = await device.scanWifiList();

// Provision device
const ssid = 'ssid';
const passphrase = 'passphrase';
await device.provision(ssid, passphrase);

// Disconnect
device.disconnect();
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
  open = 0,
  wep = 1,
  wpa2Enterprise = 2,
  wpa2Psk = 3,
  wpaPsk = 4,
  wpaWpa2Psk = 5,
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

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L164
connect(deviceName: string): Promise<ESPStatusResponse>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L249
// Important: the bridge function takes data from react-native as a base64 encoded string, decodes it and sends it to the device.
// The response is also base64 encoded data
sendData(deviceName: string, path: string, data: string): Promise<string>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L260
isSessionEstablished(deviceName: string): boolean;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L76
getProofOfPossession(deviceName: string): Promise<string | undefined>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L422
scanWifiList(deviceName: string): Promise<ESPWifiList>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L407
disconnect(deviceName: string): void;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L325
provision(deviceName: string, ssid: string, passphrase: string): Promise<ESPStatusResponse>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L444
initialiseSession(deviceName: string, sessionPath: string): Promise<ESPStatusResponse>;
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
