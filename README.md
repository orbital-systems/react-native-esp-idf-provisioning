# react-native-esp-idf-provisioning

Android and iOS wrapper for ESP IDF provisioning

## Installation

```sh
npm install react-native-esp-idf-provisioning
```

## Functions

```js
searchESPDevices(
    devicePrefix: string,
    transport: Transport,
    security: Security
  ): Promise<any>;
stopESPDevicesSearch(): void;
createESPDevice(deviceName: string, transport: Transport): Promise<any>;

// These methods require calling `createESPDevice`.
// Might want to bridge the ESPDevice class instead of keeping it in global scope?
connect(): Promise<any>;
sendData(path: string, data: string): Promise<any>;
isSessionEstablished(): boolean;
getProofOfPossession(): Promise<any>;
disconnect(): void;
provision(ssid: string, passphrase: string): Promise<any>;
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
