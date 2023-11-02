import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input, CheckBox } from '@rneui/themed';
import {
  ESPTransport,
  ESPSecurity,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import type { StackParamList } from './types';
import { styles } from './theme';

export function ProvisionScreen(
  props: NativeStackScreenProps<StackParamList, 'Provision'>
) {
  const insets = useSafeAreaInsets();
  const [name, setName] = React.useState<string>(
    props?.route?.params?.name ?? ''
  );
  const [transport, setTransport] = React.useState<ESPTransport>(
    props?.route?.params?.transport ?? ESPTransport.ble
  );
  const [security, setSecurity] = React.useState<ESPSecurity>(
    props?.route?.params?.security ?? ESPSecurity.secure2
  );
  const [softAPPassword, setSoftAPPassword] = React.useState<string>();
  const [proofOfPossession, setProofOfPossession] = React.useState<string>();
  const [username, setUsername] = React.useState<string>();

  return (
    <View style={styles.container}>
      <ScrollView>
        <Input
          label="Device name"
          placeholder="Device name"
          value={name}
          onChangeText={(value) => setName(value)}
        />
        <Text style={styles.text} h4>
          Transport
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          <CheckBox
            title="BLE"
            checked={transport === ESPTransport.ble}
            onPress={() => setTransport(ESPTransport.ble)}
          />
          <CheckBox
            title="SoftAP"
            checked={transport === ESPTransport.softap}
            onPress={() => setTransport(ESPTransport.softap)}
          />
        </View>
        <Text style={styles.text} h4>
          Security
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
          }}
        >
          <CheckBox
            title="Insecure"
            checked={security === ESPSecurity.unsecure}
            onPress={() => setSecurity(ESPSecurity.unsecure)}
          />
          <CheckBox
            title="Secure1"
            checked={security === ESPSecurity.secure}
            onPress={() => setSecurity(ESPSecurity.secure)}
          />
          <CheckBox
            title="Secure2"
            checked={security === ESPSecurity.secure2}
            onPress={() => setSecurity(ESPSecurity.secure2)}
          />
        </View>
        {transport === ESPTransport.softap && (
          <Input
            label="SoftAP password"
            placeholder="SoftAP password"
            value={softAPPassword}
            onChangeText={(value) => setSoftAPPassword(value)}
          />
        )}
        {security === ESPSecurity.secure2 && (
          <Input
            label="Username"
            placeholder="Username"
            value={username}
            onChangeText={(value) => setUsername(value)}
          />
        )}
        {(security === ESPSecurity.secure ||
          security === ESPSecurity.secure2) && (
          <Input
            label="Proof of possession"
            placeholder="Proof of possession"
            value={proofOfPossession}
            onChangeText={(value) => setProofOfPossession(value)}
          />
        )}
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <Button
          title="Connect"
          onPress={() =>
            props.navigation.navigate('Device', {
              name,
              transport,
              security,
              softAPPassword,
              username,
              proofOfPossession,
            })
          }
          type="outline"
        />
      </View>
    </View>
  );
}
