# react-native-esp-idf-provisioning

Android and iOS wrapper for ESP IDF provisioning

## Installation

```sh
npm install react-native-esp-idf-provisioning
```

## Functions

I deliberately skipped the scanQRCode functions for this first release but might want to add those as well for full public API compatibility.



```ts
// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L97
searchESPDevices(
    devicePrefix: string,
    transport: Transport,
    security: Security
  ): Promise<any>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L123
stopESPDevicesSearch(): void;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPProvisionManager.swift#L319
createESPDevice(deviceName: string, transport: Transport): Promise<any>;
```

```ts
// These methods require calling `createESPDevice`.
// Might want to bridge the ESPDevice class instead of keeping it in global scope?

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L164
connect(): Promise<any>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L249
// Important: the bridge function takes data from react-native as a base64 encoded string, decodes it and sends it to the device
sendData(path: string, data: string): Promise<any>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L260
isSessionEstablished(): boolean;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L76
getProofOfPossession(): Promise<any>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L407
disconnect(): void;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L325
provision(ssid: string, passphrase: string): Promise<any>;

// https://github.com/espressif/esp-idf-provisioning-ios/blob/master/ESPProvision/ESPDevice.swift#L444
initSession(sessionPath: string): Promise<any>;
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
