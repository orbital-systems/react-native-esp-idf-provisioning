import * as React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, ListItem, Icon } from '@rneui/themed';
import {
  type ESPWifiList,
  ESPWifiAuthMode,
} from '@orbital-systems/react-native-esp-idf-provisioning';
import type { StackParamList } from './types';
import { styles } from './theme';
import { ListItemContent } from '@rneui/base/dist/ListItem/ListItem.Content';
import { ListItemTitle } from '@rneui/base/dist/ListItem/ListItem.Title';
import { ListItemSubtitle } from '@rneui/base/dist/ListItem/ListItem.Subtitle';

export function WifiListScreen(
  props: NativeStackScreenProps<StackParamList, 'WifiList'>
) {
  const [wifiList, setWifiList] = React.useState<ESPWifiList[] | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);

  const onRefresh = React.useCallback(async () => {
    try {
      const device = props.route.params.device;

      setLoading(true);
      const espWifiList = await device.scanWifiList();
      setLoading(false);
      setWifiList(espWifiList);
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  }, [props.route.params.device]);

  const espWifiAuthToString = {
    [ESPWifiAuthMode.open]: 'Open',
    [ESPWifiAuthMode.wep]: 'WEP',
    [ESPWifiAuthMode.wpa2Enterprise]: 'WPA2 Enterprise',
    [ESPWifiAuthMode.wpaPsk]: 'WPA-PSK',
    [ESPWifiAuthMode.wpa2Psk]: 'WPA2-PSK',
    [ESPWifiAuthMode.wpaWpa2Psk]: 'WPA-WPA2-PSK',
    [ESPWifiAuthMode.wpa3Psk]: 'WPA3-PSK',
    [ESPWifiAuthMode.wpa2Wpa3Psk]: 'WPA2-WPA3-PSK',
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text>Pull to scan wifi list</Text>
        </View>
        {wifiList &&
          (wifiList.length ? (
            wifiList
              .sort((a, b) => b.rssi - a.rssi)
              .map((item) => {
                let icon = 'wifi-strength-1';
                if (item.rssi > -50) {
                  icon = 'wifi-strength-4';
                } else if (item.rssi > -60) {
                  icon = 'wifi-strength-3';
                } else if (item.rssi > -67) {
                  icon = 'wifi-strength-2';
                }

                return (
                  <ListItem
                    key={item.ssid}
                    bottomDivider
                    onPress={() =>
                      props.navigation.navigate('WifiPassword', {
                        device: props.route.params.device,
                        ssid: item.ssid,
                      })
                    }
                  >
                    <Icon name={icon} type="material-community" />
                    <ListItemContent>
                      <ListItemTitle>{item.ssid}</ListItemTitle>
                      <ListItemSubtitle>
                        {espWifiAuthToString[item.auth]}
                      </ListItemSubtitle>
                    </ListItemContent>
                    <ListItem.Chevron />
                  </ListItem>
                );
              })
          ) : (
            <ListItem style={{ opacity: 0.5 }}>
              <Icon name="alert-circle" type="material-community" />
              <ListItemContent>
                <ListItemTitle>No devices found</ListItemTitle>
              </ListItemContent>
            </ListItem>
          ))}
      </ScrollView>
    </View>
  );
}
