import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@rneui/themed';
import type { StackParamList } from './types';
import { styles } from './theme';

export function WifiPasswordScreen(
  props: NativeStackScreenProps<StackParamList, 'WifiPassword'>
) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [ssid, setSsid] = React.useState<string>(props.route.params.ssid);
  const [passphrase, setPassphrase] = React.useState<string>('');
  const [response, setResponse] = React.useState<string>('');

  const onProvision = React.useCallback(async () => {
    try {
      setLoading(true);
      const espResponse = await props.route.params.device.provision(
        ssid,
        passphrase
      );
      setResponse(JSON.stringify(espResponse));
      setLoading(false);
    } catch (error) {
      setResponse((error as Error).toString());
      setLoading(false);
      console.error(error);
    }
  }, [passphrase, props.route.params.device, ssid]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Input
          label="SSID"
          placeholder="SSID"
          value={ssid}
          onChangeText={(value) => setSsid(value)}
        />
        <Input
          label="Passphrase"
          placeholder="Passphrase"
          value={passphrase}
          onChangeText={(value) => setPassphrase(value)}
          secureTextEntry
        />
        <Text style={styles.text} h4>
          Response
        </Text>
        <Text style={styles.text}>{response}</Text>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <Button
          title="Connect"
          onPress={() => onProvision()}
          disabled={loading}
          type="outline"
        />
      </View>
    </View>
  );
}
