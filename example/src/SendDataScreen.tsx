import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { type NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, Input } from '@rneui/themed';
import type { StackParamList } from './types';
import { styles } from './theme';

export function SendDataScreen(
  props: NativeStackScreenProps<StackParamList, 'SendData'>
) {
  const insets = useSafeAreaInsets();
  const [path, setPath] = React.useState<string>('');
  const [data, setData] = React.useState<string>('');
  const [response, setResponse] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const onSend = React.useCallback(async () => {
    try {
      setLoading(true);
      const espResponse = await props.route.params.device.sendData(path, data);
      setResponse(espResponse);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.error(error);
    }
  }, [data, path, props.route.params.device]);

  return (
    <View style={styles.container}>
      <ScrollView>
        <Input
          label="Path"
          placeholder="Path"
          value={path}
          onChangeText={(value) => setPath(value)}
        />
        <Input
          label="Data"
          placeholder="Data"
          value={data}
          onChangeText={(value) => setData(value)}
        />
        <Text style={styles.text} h4>
          Response
        </Text>
        <Text style={styles.text}>{response}</Text>
      </ScrollView>
      <View style={{ paddingBottom: insets.bottom }}>
        <Button
          title="Send"
          onPress={onSend}
          disabled={loading}
          loading={loading}
          type="outline"
        />
      </View>
    </View>
  );
}
