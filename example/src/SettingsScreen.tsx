import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CheckBox, Input, Text } from '@rneui/themed';
import DefaultPreference from 'react-native-default-preference';
import {
  ESPTransport,
  ESPSecurity,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import { styles } from './theme';

export function SettingsScreen() {
  const [prefix, setPrefix] = React.useState<string>('');
  const [transport, setTransport] = React.useState<ESPTransport>(
    ESPTransport.ble
  );
  const [security, setSecurity] = React.useState<ESPSecurity>(
    ESPSecurity.secure2
  );

  useFocusEffect(
    React.useCallback(() => {
      DefaultPreference.get('prefix').then((value) => {
        if (typeof value === 'string') {
          setPrefix(value);
        }
      });
      DefaultPreference.get('transport').then((value) => {
        if (typeof value === 'string') {
          setTransport(value as ESPTransport);
        }
      });
      DefaultPreference.get('security').then((value) => {
        if (typeof value === 'string') {
          setSecurity(Number(value) as ESPSecurity);
        }
      });
    }, [])
  );

  const onPrefixBlur = React.useCallback(async () => {
    try {
      if (typeof prefix === 'string') {
        await DefaultPreference.set('prefix', prefix);
      }
    } catch (error) {
      console.error(error);
    }
  }, [prefix]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Input
          label="Search prefix"
          placeholder="Search prefix"
          value={prefix}
          onChangeText={(value) => setPrefix(value)}
          onBlur={onPrefixBlur}
        />
        <Text style={styles.text} h4>
          Search transport
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
            onPress={() => {
              setTransport(ESPTransport.ble);
              DefaultPreference.set('transport', ESPTransport.ble);
            }}
          />
          <CheckBox
            title="SoftAP"
            checked={transport === ESPTransport.softap}
            onPress={() => {
              setTransport(ESPTransport.softap);
              DefaultPreference.set('transport', ESPTransport.softap);
            }}
          />
          <Text style={styles.text} h4>
            Search security
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
              onPress={() => {
                setSecurity(ESPSecurity.unsecure);
                DefaultPreference.set(
                  'security',
                  ESPSecurity.unsecure.toString()
                );
              }}
            />
            <CheckBox
              title="Secure1"
              checked={security === ESPSecurity.secure}
              onPress={() => {
                setSecurity(ESPSecurity.secure);
                DefaultPreference.set(
                  'security',
                  ESPSecurity.secure.toString()
                );
              }}
            />
            <CheckBox
              title="Secure2"
              checked={security === ESPSecurity.secure2}
              onPress={() => {
                setSecurity(ESPSecurity.secure2);
                DefaultPreference.set(
                  'security',
                  ESPSecurity.secure2.toString()
                );
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
