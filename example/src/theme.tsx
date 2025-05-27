import { createTheme, lightColors } from '@rneui/themed';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  provision: {},
  text: {
    color: 'black',
    width: '100%',
    fontSize: 16,
    paddingVertical: 5,
  },
});

export const theme = createTheme({
  components: {
    Button: {
      buttonStyle: {
        padding: 16,
        borderRadius: 16,
      },
    },
    ListItem: {
      pad: 16,
      containerStyle: {
        paddingHorizontal: 0,
        paddingVertical: 16,
      },
    },
    ListItemTitle: {
      style: {
        fontSize: 16,
      },
    },
    ListItemSubtitle: {
      style: {
        color: lightColors.grey3,
        fontSize: 12,
      },
    },
    Input: {
      labelStyle: {
        fontSize: 16,
        color: lightColors.black,
        paddingHorizontal: 0,
        paddingVertical: 8,
        fontVariant: ['small-caps'],
        textTransform: 'lowercase',
        fontWeight: 'normal',
      },
      inputStyle: {
        fontSize: 16,
        paddingHorizontal: 16,
      },
      inputContainerStyle: {
        borderColor: lightColors.black,
        borderWidth: 0.25,
        borderBottomColor: lightColors.black,
        borderBottomWidth: 0.25,
        borderRadius: 16,
      },
      containerStyle: {
        paddingHorizontal: 0,
        paddingVertical: 8,
      },
      errorStyle: {
        margin: 0,
        height: 0,
      },
    },
    Text: {
      style: {
        paddingHorizontal: 0,
        paddingVertical: 8,
      },
      h4Style: {
        fontSize: 16,
        color: lightColors.black,
        fontWeight: 'normal',
        fontVariant: ['small-caps'],
        textTransform: 'lowercase',
      },
    },
    CheckBox: {
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
      containerStyle: {
        paddingHorizontal: 0,
        paddingVertical: 8,
      },
    },
  },
});
