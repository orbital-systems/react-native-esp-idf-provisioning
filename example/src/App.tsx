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
import {
  ESPProvisionManager,
  ESPDevice,
  ESPTransport,
  ESPSecurity,
  type ESPWifiList,
} from '@orbital-systems/react-native-esp-idf-provisioning';

export default function App() {
  const [devices, setDevices] = React.useState<ESPDevice[]>();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [wifiList, setWifiList] = React.useState<{
    [key: string]: ESPWifiList[];
  }>({});
  const [path, setPath] = React.useState<string>('');
  const [data, setData] = React.useState<string>('');
  const [dataResponse, setDataResponse] = React.useState<string>('');
  const [ssid, setSsid] = React.useState<string>();
  const [passphrase, setPassphrase] = React.useState<string>();
  const [modal, setModal] = React.useState<string>();

  const onSearchESPDevices = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setDevices(undefined);
      const espDevices = await ESPProvisionManager.searchESPDevices(
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

    return () => {
      device.disconnect();
    };
  }, []);

  const onDisconnect = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);
        await device.disconnect();
        setPath('');
        setData('');
        setDataResponse('');
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

  const onSendData = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);

        setDataResponse('');
        const response = await device.sendData(path, data);
        setDataResponse(response);

        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        console.error(error);
      }
    },
    [data, path]
  );

  const onProvision = React.useCallback(
    async (device: ESPDevice) => {
      try {
        setIsLoading(true);
        const response = await device.provision(ssid!, passphrase!);
        console.info(response);
        await device.disconnect();
        setPath('');
        setData('');
        setDataResponse('');
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
        setModal(undefined);
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
      <Text style={styles.text}>{isLoading ? 'Loading...' : 'Ready'}</Text>
      <Button onPress={onSearchESPDevices} title="Search ESP Devices" />
      {devices?.map((device) => (
        <View key={device.name} style={styles.device}>
          <Text style={styles.text}>{device.name}</Text>
          <Button
            title={device.connected ? 'Disconnect' : 'Connect'}
            onPress={() =>
              device.connected ? onDisconnect(device) : onConnect(device)
            }
          />
          <Button
            title="Scan wifi list"
            onPress={() => onScanWifiList(device)}
            disabled={!device.connected}
          />
          {device.connected && (
            <TextInput
              style={styles.text}
              placeholderTextColor="black"
              placeholder="Path"
              value={path}
              onChangeText={(value) => setPath(value)}
            />
          )}
          {device.connected && (
            <TextInput
              style={styles.text}
              placeholderTextColor="black"
              placeholder="Data"
              value={data}
              onChangeText={(value) => setData(value)}
            />
          )}
          <Button
            title="Send data"
            onPress={() => onSendData(device)}
            disabled={!device.connected}
          />
          <Text style={styles.text}>{dataResponse}</Text>
          {wifiList[device.name] && <Text style={styles.text}>Wifi list</Text>}
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
              <Text style={styles.text}>{device.name}</Text>
              <Text style={styles.text}>{ssid}</Text>
              <TextInput
                style={styles.text}
                placeholderTextColor="black"
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
    paddingTop: '20%',
    backgroundColor: 'white',
  },
  device: {
    paddingTop: '5%',
  },
  modal: {
    flex: 1,
    paddingTop: '20%',
  },
  text: {
    color: 'black',
    textAlign: 'center',
    width: '100%',
    fontSize: 16,
    paddingVertical: 5,
  },
  input: {
    backgroundColor: 'white',
    color: 'black',
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
});
