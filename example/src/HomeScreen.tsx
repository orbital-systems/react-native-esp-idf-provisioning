import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, ListItem, Icon } from '@rneui/themed';
import DefaultPreference from 'react-native-default-preference';
import {
  ESPProvisionManager,
  ESPDevice,
  ESPTransport,
  ESPSecurity,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import type { StackParamList } from './types';
import { styles } from './theme';

export function HomeScreen(
  props: NativeStackScreenProps<StackParamList, 'Home'>
) {
  const [devices, setDevices] = React.useState<ESPDevice[] | undefined>();
  const [isLoading, setLoading] = React.useState<boolean>(false);
  const [prefix, setPrefix] = React.useState<string | undefined | null>('');
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      DefaultPreference.get('prefix').then((value) => {
        setPrefix(value);
      });
    }, [])
  );

  React.useLayoutEffect(() => {
    props.navigation.setOptions({
      title: 'Home',
      headerRight: () => (
        <Button
          icon={{ type: 'material-community', name: 'cog' }}
          onPress={() => props.navigation.navigate('Settings')}
          type="clear"
          buttonStyle={{ padding: 0 }}
        />
      ),
    });
  }, [props.navigation]);

  const onSearchESPDevices = React.useCallback(async () => {
    try {
      setLoading(true);
      setDevices(undefined);
      const espDevices = await ESPProvisionManager.searchESPDevices(
        prefix ?? '',
        ESPTransport.ble,
        ESPSecurity.secure
      );
      setLoading(false);
      setDevices(espDevices);
    } catch (error) {
      setDevices([]);
      setLoading(false);
      console.error(error);
    }
  }, [prefix]);

  const espSecurityToString = {
    [ESPSecurity.unsecure]: 'Insecure',
    [ESPSecurity.secure]: 'Secure',
    [ESPSecurity.secure2]: 'Secure2',
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onSearchESPDevices}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
        }}
      >
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>
            Pull to search for devices{' '}
            {prefix ? `starting with "${prefix}"` : ''}
          </Text>
        </View>
        <View style={{ flexGrow: 1 }}>
          {devices &&
            (devices.length ? (
              devices.map((device) => (
                <ListItem
                  key={device.name}
                  bottomDivider
                  onPress={() =>
                    props.navigation.navigate('Provision', {
                      name: device.name,
                      transport: device.transport,
                      security: device.security,
                    })
                  }
                >
                  <Icon name="chip" type="material-community" />
                  <ListItem.Content>
                    <ListItem.Title>{device.name}</ListItem.Title>
                    <ListItem.Subtitle>
                      {espSecurityToString[device.security]}
                    </ListItem.Subtitle>
                  </ListItem.Content>
                  <ListItem.Chevron />
                </ListItem>
              ))
            ) : (
              <ListItem style={{ opacity: 0.5 }}>
                <Icon name="alert-circle" type="material-community" />
                <ListItem.Content>
                  <ListItem.Title>No devices found</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            ))}
        </View>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <Button
          title="Provision"
          type="outline"
          onPress={() => props.navigation.navigate('Provision')}
        />
      </View>
    </View>
  );
}
