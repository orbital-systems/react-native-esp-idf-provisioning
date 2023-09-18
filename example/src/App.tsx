import * as React from 'react';

import { StyleSheet, View, Text } from 'react-native';
import { searchESPDevices } from 'react-native-esp-idf-provisioning';
import { Security, Transport } from '../../src/types';

export default function App() {
  const [result, setResult] = React.useState<any>();

  React.useEffect(() => {
    searchESPDevices('ORBITAL_', Transport.ble, Security.secure)
      .then((devices) => {
        console.log(devices);
        setResult(devices);
      })
      .catch((error) => {
        console.error(error);
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
