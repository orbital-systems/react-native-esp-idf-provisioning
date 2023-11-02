import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Input } from '@rneui/themed';
import DefaultPreference from 'react-native-default-preference';
import { styles } from './theme';

export function SettingsScreen() {
  const [prefix, setPrefix] = React.useState<string>('');

  React.useEffect(() => {
    DefaultPreference.get('prefix').then((value) => {
      if (value) {
        setPrefix(value);
      }
    });
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      DefaultPreference.get('prefix').then((value) => {
        if (typeof value === 'string') {
          setPrefix(value);
        }
      });
    }, [])
  );

  const onBlur = React.useCallback(async () => {
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
          onBlur={onBlur}
        />
      </ScrollView>
    </View>
  );
}
