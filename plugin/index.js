const {
  withAndroidManifest,
  createRunOncePlugin,
  withInfoPlist,
} = require('expo/config-plugins');

const pkg = require('../package.json');

const DEFAULTS = {
  transport: 'both',
  bluetoothAlwaysPermission:
    'Allow $(PRODUCT_NAME) to discover, connect and provision nearby Bluetooth devices.',
  locationWhenInUsePermission:
    'Allow $(PRODUCT_NAME) to access your location while provisioning devices over Wi-Fi.',
  localNetworkPermission:
    'Allow $(PRODUCT_NAME) to communicate with devices on your local network while provisioning.',
};

const ANDROID_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
];

const ANDROID_SOFTAP_PERMISSIONS = [
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.CHANGE_WIFI_STATE',
  'android.permission.ACCESS_FINE_LOCATION',
];

const ANDROID_BLE_PERMISSIONS = [
  'android.permission.BLUETOOTH_SCAN',
  'android.permission.BLUETOOTH_ADVERTISE',
  'android.permission.BLUETOOTH_CONNECT',
  'android.permission.ACCESS_FINE_LOCATION',
];

const LEGACY_ANDROID_PERMISSIONS = [
  {
    name: 'android.permission.BLUETOOTH',
    maxSdkVersion: '30',
  },
  {
    name: 'android.permission.BLUETOOTH_ADMIN',
    maxSdkVersion: '30',
  },
];

function hasPermission(manifest, permission) {
  return (manifest['uses-permission'] || []).some(
    (item) => item.$['android:name'] === permission.name
  );
}

function addPermission(manifest, permission) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  if (hasPermission(manifest, permission)) {
    return;
  }

  const entry = {
    $: {
      'android:name': permission.name,
    },
  };

  if (permission.maxSdkVersion) {
    entry.$['android:maxSdkVersion'] = permission.maxSdkVersion;
  }

  manifest['uses-permission'].push(entry);
}

function withEspIdfProvisioning(config, props = {}) {
  const permissions = {
    ...DEFAULTS,
    ...props,
  };
  const transport = String(permissions.transport || 'both').toLowerCase();
  const usesBle = transport === 'ble' || transport === 'both';
  const usesSoftap = transport === 'softap' || transport === 'both';

  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    ANDROID_PERMISSIONS.forEach((name) => {
      addPermission(manifest, { name });
    });

    if (usesSoftap) {
      ANDROID_SOFTAP_PERMISSIONS.forEach((name) => {
        addPermission(manifest, { name });
      });
    }

    if (usesBle) {
      ANDROID_BLE_PERMISSIONS.forEach((name) => {
        addPermission(manifest, { name });
      });
      LEGACY_ANDROID_PERMISSIONS.forEach((permission) => {
        addPermission(manifest, permission);
      });
    }

    return config;
  });

  return withInfoPlist(config, (config) => {
    if (usesBle && permissions.bluetoothAlwaysPermission !== false) {
      config.modResults.NSBluetoothAlwaysUsageDescription =
        permissions.bluetoothAlwaysPermission;
    }

    if (usesSoftap && permissions.locationWhenInUsePermission !== false) {
      config.modResults.NSLocationWhenInUseUsageDescription =
        permissions.locationWhenInUsePermission;
    }

    if (usesSoftap && permissions.localNetworkPermission !== false) {
      config.modResults.NSLocalNetworkUsageDescription =
        permissions.localNetworkPermission;
    }

    if (usesSoftap && permissions.localNetworkPermission !== false) {
      const ats = config.modResults.NSAppTransportSecurity || {};
      config.modResults.NSAppTransportSecurity = {
        ...ats,
        NSAllowsLocalNetworking: true,
      };
    }

    return config;
  });
}

module.exports = createRunOncePlugin(
  withEspIdfProvisioning,
  pkg.name,
  pkg.version
);
