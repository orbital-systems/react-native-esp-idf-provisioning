const mockCreateESPDevice = jest.fn().mockResolvedValue({});
const mockConnect = jest.fn().mockResolvedValue({ status: 'connected' });

jest.mock('react-native', () => ({
  NativeModules: {
    EspIdfProvisioning: {
      createESPDevice: mockCreateESPDevice,
      connect: mockConnect,
    },
  },
  Platform: {
    select: jest.fn((options) => options.default),
  },
}));

describe('ESPDevice.connect', () => {
  beforeEach(() => {
    mockCreateESPDevice.mockClear();
    mockConnect.mockClear();
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
