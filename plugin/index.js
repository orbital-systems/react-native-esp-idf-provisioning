const {
  withAndroidManifest,
  createRunOncePlugin,
  withInfoPlist,
} = require('expo/config-plugins');

const pkg = require('../package.json');

const DEFAULTS = {
  transport: 'both',
  neverForLocation: false,
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
  'android.permission.CHANGE_NETWORK_STATE',
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

function findPermission(manifest, name) {
  return (manifest['uses-permission'] || []).find(
    (item) => item.$['android:name'] === name
  );
}

function addPermission(manifest, permission) {
  if (!manifest['uses-permission']) {
    manifest['uses-permission'] = [];
  }

  const attributes = {
    'android:name': permission.name,
  };

  if (permission.maxSdkVersion) {
    attributes['android:maxSdkVersion'] = permission.maxSdkVersion;
  }

  if (permission.usesPermissionFlags) {
    attributes['android:usesPermissionFlags'] = permission.usesPermissionFlags;
  }

  const existing = findPermission(manifest, permission.name);

  if (existing) {
    Object.assign(existing.$, attributes);
    return;
  }

  manifest['uses-permission'].push({ $: attributes });
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
      addPermission(manifest, {
        name: 'android.permission.BLUETOOTH_SCAN',
        ...(permissions.neverForLocation
          ? { usesPermissionFlags: 'neverForLocation' }
          : {}),
      });
      addPermission(manifest, { name: 'android.permission.BLUETOOTH_ADVERTISE' });
      addPermission(manifest, { name: 'android.permission.BLUETOOTH_CONNECT' });
      addPermission(manifest, {
        name: 'android.permission.ACCESS_FINE_LOCATION',
        ...(permissions.neverForLocation && !usesSoftap
          ? { maxSdkVersion: '30' }
          : {}),
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
