const mockCreateESPDevice = jest.fn().mockResolvedValue({});
const mockConnect = jest.fn().mockResolvedValue({ status: 'connected' });
const mockSendData = jest.fn();
const mockListeners = new Map<string, Set<(event: unknown) => void>>();
const mockNativeEventEmitter = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: {
    EspIdfProvisioning: {
      createESPDevice: mockCreateESPDevice,
      connect: mockConnect,
      sendData: mockSendData,
    },
  },
  NativeEventEmitter: jest.fn().mockImplementation((nativeModule) => {
    mockNativeEventEmitter(nativeModule);
    return {
      addListener: (eventName: string, listener: (event: unknown) => void) => {
        const listeners = mockListeners.get(eventName) ?? new Set();
        listeners.add(listener);
        mockListeners.set(eventName, listeners);
        return { remove: () => listeners.delete(listener) };
      },
    };
  }),
  Platform: {
    select: jest.fn((options) => options.default),
  },
}));

describe('ESPDevice.connect', () => {
  beforeEach(() => {
    mockCreateESPDevice.mockClear();
    mockConnect.mockClear();
    mockSendData.mockClear();
  });

  it('normalizes a missing PoP to empty string for security 0 devices', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    const device = new ESPDevice({
      name: 'PROV_123',
      transport: ESPTransport.ble,
      security: ESPSecurity.unsecure,
    });

    await device.connect(undefined, null, null);

    expect(mockCreateESPDevice).toHaveBeenCalledWith(
      'PROV_123',
      ESPTransport.ble,
      ESPSecurity.unsecure,
      '',
      null,
      null
    );
  });

  it('keeps PoP null for secure devices', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    const device = new ESPDevice({
      name: 'PROV_456',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure,
    });

    await device.connect(null, null, null);

    expect(mockCreateESPDevice).toHaveBeenCalledWith(
      'PROV_456',
      ESPTransport.ble,
      ESPSecurity.secure,
      null,
      null,
      null
    );
  });

  it('rejects secure2 devices without a proof of possession', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    const device = new ESPDevice({
      name: 'PROV_789',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    await expect(device.connect(null, null, 'user')).rejects.toThrow(
      'Proof of possession is required for devices using ESPSecurity.secure2.'
    );

    expect(mockCreateESPDevice).not.toHaveBeenCalled();
  });

  it('rejects secure2 devices without a username', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    const device = new ESPDevice({
      name: 'PROV_999',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    await expect(device.connect('pop', null, null)).rejects.toThrow(
      'Username is required for devices using ESPSecurity.secure2.'
    );

    expect(mockCreateESPDevice).not.toHaveBeenCalled();
  });
});

describe('ESPDevice.sendData', () => {
  beforeEach(() => {
    mockSendData.mockClear();
  });

  it('adds session guidance when custom endpoint requests fail', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    mockSendData.mockRejectedValueOnce(new Error('Write to BLE failed'));

    const device = new ESPDevice({
      name: 'PROV_SEND',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    await expect(device.sendData('/custom-endpoint', '{"foo":"bar"}')).rejects
      .toThrow(
        'Request to send data to device failed: Write to BLE failed. Custom endpoint requests require an active provisioning session; if this happens after provision(), the device firmware may have already closed the session or disconnected the transport.'
      );
  });

  it('still round-trips plain UTF-8 text, including characters above U+00FF', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    mockSendData.mockImplementation((_name: string, _path: string, base64Data: string) =>
      Promise.resolve(base64Data)
    );

    const device = new ESPDevice({
      name: 'PROV_TEXT',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    const response = await device.sendData('/custom-endpoint', '{"ssid":"Café ☕"}');

    expect(response).toBe('{"ssid":"Café ☕"}');
  });
});

describe('ESPDevice.sendRawData', () => {
  beforeEach(() => {
    mockSendData.mockClear();
  });

  it('round-trips raw bytes containing values >= 0x80 without corruption', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');

    mockSendData.mockImplementation((_name: string, _path: string, base64Data: string) =>
      Promise.resolve(base64Data)
    );

    const device = new ESPDevice({
      name: 'PROV_RAW',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    const payload = new Uint8Array([0x56, 0x45, 0x52, 0x31, 0x94, 0x00]); // contains 0x94
    const response = await device.sendRawData('/custom-endpoint', payload);

    expect(Array.from(response)).toEqual(Array.from(payload));
  });

  it('keeps the native error code', async () => {
    const { ESPDevice, ESPSecurity, ESPTransport, ESP_DEVICE_DISCONNECTED_ERROR } =
      require('../index');

    mockSendData.mockRejectedValueOnce(
      Object.assign(new Error('Device is not connected.'), {
        code: 'E_DEVICE_DISCONNECTED',
      })
    );

    const device = new ESPDevice({
      name: 'PROV_RAW',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    await expect(
      device.sendRawData('/custom-endpoint', new Uint8Array([1]))
    ).rejects.toMatchObject({ code: ESP_DEVICE_DISCONNECTED_ERROR });
  });
});

describe('ESPDevice.onDisconnected', () => {
  const emit = (event: unknown) =>
    mockListeners
      .get('EspIdfProvisioning.deviceDisconnected')
      ?.forEach((listener) => listener(event));

  beforeEach(() => {
    mockListeners.clear();
  });

  it('subscribes through the native module so iOS emits the event', () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');
    const { NativeModules } = require('react-native');

    const device = new ESPDevice({
      name: 'PROV_EMITTER',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    device.onDisconnected(jest.fn());

    expect(mockNativeEventEmitter).toHaveBeenCalledWith(
      NativeModules.EspIdfProvisioning
    );
  });

  it('only calls back for its own device', () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');
    const callback = jest.fn();

    const device = new ESPDevice({
      name: 'PROV_A',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    device.onDisconnected(callback);
    emit({ deviceName: 'PROV_B' });
    expect(callback).not.toHaveBeenCalled();

    emit({ deviceName: 'PROV_A' });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops calling back after unsubscribing', () => {
    const { ESPDevice, ESPSecurity, ESPTransport } = require('../index');
    const callback = jest.fn();

    const device = new ESPDevice({
      name: 'PROV_A',
      transport: ESPTransport.ble,
      security: ESPSecurity.secure2,
    });

    const unsubscribe = device.onDisconnected(callback);
    unsubscribe();
    emit({ deviceName: 'PROV_A' });

    expect(callback).not.toHaveBeenCalled();
  });
});
