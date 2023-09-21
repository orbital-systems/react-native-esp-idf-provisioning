import * as React from 'react';

import {
  StyleSheet,
  Text,
  Button,
  ScrollView,
  TextInput,
  Modal,
  View,
} from 'react-native';
import { searchESPDevices, ESPDevice } from 'react-native-esp-idf-provisioning';
import { ESPSecurity, ESPTransport, type ESPWifiList } from '../../src/types';

export default function App() {
  const [devices, setDevices] = React.useState<ESPDevice[]>();
  const [wifiList, setWifiList] = React.useState<{
    [key: string]: ESPWifiList[];
  }>({});
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [ssid, setSsid] = React.useState<string>();
  const [passphrase, setPassphrase] = React.useState<string>();
  const [modal, setModal] = React.useState<string>();

  const onSearchESPDevices = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setDevices(undefined);
      const espDevices = await searchESPDevices(
        'ORBITAL_',
        ESPTransport.ble,
        ESPSecurity.secure
      );
      setIsLoading(false);

      console.info(espDevices);
      setDevices(espDevices);
    } catch (error) {
      setIsLoading(false);
      console.error(error);
    }
  }, []);

  const onConnect = React.useCallback(async (device: ESPDevice) => {
    try {
      const proofOfPossesion = '2D2YDA6EPKKU';
      setIsLoading(true);
      const response = await device.connect(proofOfPossesion);
      console.info(response);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      console.error(error);
    }
  }, []);

  const onDisconnect = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);
        await device.disconnect();
        setWifiList(
          Object.keys(wifiList)
            .filter((key) => key !== device.name)
            .reduce(
              (acc, key) => ({
                ...acc,
                [key]: wifiList[key],
              }),
              {}
            )
        );
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.error(error);
      }
    },
    [wifiList]
  );

  const onScanWifiList = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);
        const list = await device.scanWifiList();
        setIsLoading(false);
        console.info(list);
        setWifiList({ ...wifiList, [device.name]: list });
      } catch (error) {
        setIsLoading(false);
        console.error(error);
      }
    },
    [wifiList]
  );

  const onProvision = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);
        const response = await device.provision(ssid!, passphrase!);
        console.info(response);
        setIsLoading(false);
        setSsid(undefined);
        setPassphrase(undefined);
        setWifiList(
          Object.keys(wifiList)
            .filter((key) => key !== device.name)
            .reduce(
              (acc, key) => ({
                ...acc,
                [key]: wifiList[key],
              }),
              {}
            )
        );
      } catch (error) {
        setIsLoading(false);
        setPassphrase(undefined);
        console.error(error);
      }
    },
    [passphrase, ssid, wifiList]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button onPress={onSearchESPDevices} title="Search ESP Devices" />
      <Text>{isLoading ? 'Loading...' : 'Ready'}</Text>
      {devices?.map((device) => (
        <View key={device.name} style={styles.device}>
          <Button
            title={
              device.connected
                ? `Disconnect from ${device.name}`
                : `Connect to ${device.name}`
            }
            onPress={() =>
              device.connected ? onDisconnect(device) : onConnect(device)
            }
          />
          <Button
            title={`Scan wifi list on ${device.name}`}
            onPress={() => onScanWifiList(device)}
            disabled={!device.connected}
          />
          {wifiList[device.name]?.map((item) => (
            <Button
              key={item.ssid}
              title={`${item.ssid} (${
                [
                  'open',
                  'wep',
                  'wpa2Enterprise',
                  'wpa2Psk',
                  'wpaPsk',
                  'wpaWpa2Psk',
                ][item.auth]
              })`}
              onPress={() => {
                setModal(device.name);
                setSsid(item.ssid);
              }}
            />
          ))}
          <Modal
            visible={modal === device.name}
            onRequestClose={() => setSsid(undefined)}
            animationType="slide"
            presentationStyle="pageSheet"
          >
            <View style={styles.modal}>
              <Text style={styles.text}>{ssid}</Text>
              <TextInput
                style={styles.text}
                textContentType="password"
                placeholder="Passphrase"
                value={passphrase}
                onChangeText={(value) => setPassphrase(value)}
                secureTextEntry
              />
              <Button
                title="Provision"
                onPress={() => onProvision(device)}
                disabled={isLoading}
              />
              <Button
                title="Back"
                onPress={() => {
                  setModal(undefined);
                  setSsid(undefined);
                  setPassphrase(undefined);
                }}
              />
            </View>
          </Modal>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: '20%',
  },
  device: {
    alignItems: 'center',
    paddingTop: '5%',
  },
  modal: {
    flex: 1,
    alignItems: 'center',
    paddingTop: '20%',
  },
  text: {
    textAlign: 'center',
    width: '100%',
    fontSize: 16,
    paddingVertical: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
