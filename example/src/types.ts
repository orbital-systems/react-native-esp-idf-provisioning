import {
  ESPDevice,
  ESPTransport,
  ESPSecurity,
} from '@orbital-systems/react-native-esp-idf-provisioning';

export type StackParamList = {
  Home: undefined;
  Settings: undefined;
  Provision:
    | { name: string; transport: ESPTransport; security: ESPSecurity }
    | undefined;
  WifiList: { device: ESPDevice };
  WifiPassword: { device: ESPDevice; ssid: string };
  Device: {
    name: string;
    transport: ESPTransport;
    security: ESPSecurity;
    softAPPassword?: string;
    proofOfPossession?: string;
    username?: string;
  };
  SendData: {
    device: ESPDevice;
  };
};
