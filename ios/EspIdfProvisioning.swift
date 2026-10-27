//
//  EspIdfProvisioning.swift
//  react-native-esp-idf-provisioning
//
//  Created by Mateo Gianolio on 2023-09-18.
//

import Foundation
import CoreBluetooth
import ESPProvision
import React

// Settles a promise at most once, so it can also be rejected when its device disconnects.
private class DevicePromise {
    let espDevice: ESPDevice
    var onSettled: (() -> Void)?
    private let resolveBlock: RCTPromiseResolveBlock
    private let rejectBlock: RCTPromiseRejectBlock
    private let lock = NSLock()
    private var settled = false

    init(espDevice: ESPDevice, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        self.espDevice = espDevice
        self.resolveBlock = resolve
        self.rejectBlock = reject
    }

    @discardableResult
    func resolve(_ value: Any?) -> Bool {
        guard settle() else { return false }
        resolveBlock(value)
        return true
    }

    func reject(_ code: String, _ message: String?) {
        guard settle() else { return }
        rejectBlock(code, message, nil)
    }

    private func settle() -> Bool {
        lock.lock()
        let wasSettled = settled
        settled = true
        lock.unlock()

        if !wasSettled {
            onSettled?()
        }
        return !wasSettled
    }
}

// ESPDevice only reports a disconnect after connect() through its bleDelegate, never through
// the connect completion handler. The delegate is retained by the device, so hold both weakly.
private class DisconnectObserver: ESPBLEDelegate {
    private weak var module: EspIdfProvisioning?
    private weak var espDevice: ESPDevice?

    init(module: EspIdfProvisioning, espDevice: ESPDevice) {
        self.module = module
        self.espDevice = espDevice
    }

    func peripheralConnected() {}

    func peripheralFailedToConnect(peripheral: CBPeripheral?, error: Error?) {}

    func peripheralDisconnected(peripheral: CBPeripheral, error: Error?) {
        // Reconnecting cancels the old connection, which is reported after the new one started
        guard peripheral.state != .connecting, peripheral.state != .connected, let espDevice = espDevice else { return }
        module?.deviceDidDisconnect(espDevice)
    }
}

@objc(EspIdfProvisioning)
class EspIdfProvisioning: RCTEventEmitter {
    // Think we need to keep a dictionary of espDevices since we can't pass native
    // classes to react-native
    private var espDevices: [String : ESPDevice] = [:]
    private var softAPPasswords: [String : String] = [:]

    // Only one device is connected at a time, keyed by the deviceName passed to connect().
    // Devices from one scan share a single ESPBleTransport, so connecting one cancels the other.
    private let stateLock = NSLock()
    private var connectedDeviceName: String?
    private var connectedDevice: ESPDevice?
    private var pendingPromises: [ObjectIdentifier: DevicePromise] = [:]
    private var isConnecting = false
    private var hasListeners = false

    static let deviceDisconnectedEventName = "EspIdfProvisioning.deviceDisconnected"
    static let deviceDisconnectedErrorCode = "E_DEVICE_DISCONNECTED"

    override func supportedEvents() -> [String]! {
        return [EspIdfProvisioning.deviceDisconnectedEventName]
    }

    override func startObserving() { hasListeners = true }

    override func stopObserving() { hasListeners = false }

    private func withState<T>(_ body: () -> T) -> T {
        stateLock.lock()
        defer { stateLock.unlock() }
        return body()
    }

    // Call before isConnected(), so a disconnect in between still rejects the promise
    private func trackPromise(espDevice: ESPDevice, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock, onSettled: (() -> Void)? = nil) -> DevicePromise {
        let promise = DevicePromise(espDevice: espDevice, resolve: resolve, reject: reject)
        let key = ObjectIdentifier(promise)
        promise.onSettled = { [weak self] in
            self?.withState { _ = self?.pendingPromises.removeValue(forKey: key) }
            onSettled?()
        }
        withState { pendingPromises[key] = promise }
        return promise
    }

    private func rejectPendingPromises(for espDevice: ESPDevice) {
        let promises = withState { pendingPromises.values.filter { $0.espDevice === espDevice } }
        promises.forEach { $0.reject(EspIdfProvisioning.deviceDisconnectedErrorCode, "Device disconnected.") }
    }

    private func isConnected(deviceName: String, espDevice: ESPDevice) -> Bool {
        return withState { connectedDeviceName == deviceName && connectedDevice === espDevice }
    }

    private func takeSession(where matches: (String, ESPDevice) -> Bool = { _, _ in true }) -> (name: String, device: ESPDevice)? {
        return withState {
            guard let name = connectedDeviceName, let device = connectedDevice, matches(name, device) else { return nil }
            connectedDevice = nil
            connectedDeviceName = nil
            return (name, device)
        }
    }

    // Clears the session first, so the resulting disconnect isn't reported as unexpected
    private func endSession(where matches: (String, ESPDevice) -> Bool = { _, _ in true }) {
        guard let session = takeSession(where: matches) else { return }
        rejectPendingPromises(for: session.device)
        session.device.disconnect()
    }

    fileprivate func deviceDidDisconnect(_ espDevice: ESPDevice) {
        let deviceName = takeSession { $1 === espDevice }?.name

        rejectPendingPromises(for: espDevice)

        // Disconnects requested through disconnect() or connect() have already cleared the session
        if let deviceName = deviceName, hasListeners {
            sendEvent(withName: EspIdfProvisioning.deviceDisconnectedEventName, body: ["deviceName": deviceName])
        }
    }

    @objc(searchESPDevices:transport:security:resolve:reject:)
    func searchESPDevices(devicePrefix: String, transport: String, security: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let transport = ESPTransport(rawValue: transport) ?? ESPTransport.ble
        let security = ESPSecurity(rawValue: security)

        // Replacing the connected ESPDevice would orphan its session
        endSession()
        self.espDevices.removeAll()
        
        var invoked = false
        ESPProvisionManager.shared.searchESPDevices(devicePrefix: devicePrefix, transport: transport, security: security) { espDevices, error in
            // Prevent multiple callback invokation error 
            guard !invoked else { return }

            if error != nil {
                reject("error", error?.description, nil)
                invoked = true
                return
            }

            espDevices?.forEach {
                self.espDevices[$0.name] = $0
            }

            resolve(espDevices!.map {[
                "name": $0.name,
                "transport": $0.transport.rawValue,
                "security": $0.security.rawValue,
            ]})
            invoked = true
        }
    }

    @objc(stopESPDevicesSearch)
    func stopESPDevicesSearch() {
        ESPProvisionManager.shared.stopESPDevicesSearch()
    }

    @objc(createESPDevice:transport:security:proofOfPossession:softAPPassword:username:resolve:reject:)
    func createESPDevice(deviceName: String, transport: String, security: Int, proofOfPossession: String? = nil, softAPPassword: String? = nil, username: String? = nil, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let transport = ESPTransport(rawValue: transport) ?? ESPTransport.ble
        let security = ESPSecurity(rawValue: security)

        var invoked = false
        ESPProvisionManager.shared.createESPDevice(deviceName: deviceName, transport: transport, security: security, proofOfPossession: proofOfPossession, softAPPassword: softAPPassword, username: username) { espDevice, error in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            if error != nil {
                reject("error", error?.description, nil)
                invoked = true
                return
            }

            // Replacing the connected ESPDevice would orphan its session
            self.endSession { name, _ in name == espDevice!.name }
            self.softAPPasswords[espDevice!.name] = softAPPassword
            self.espDevices[espDevice!.name] = espDevice

            resolve([
                "name": espDevice!.name,
                "transport": espDevice!.transport.rawValue,
                "security": espDevice!.security.rawValue,
            ])
            invoked = true
        }
    }

    @objc(connect:resolve:reject:)
    func connect(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let wasConnecting = withState { () -> Bool in
            defer { isConnecting = true }
            return isConnecting
        }
        guard !wasConnecting else {
            reject("error", "Another device connection is already in progress.", nil)
            return
        }

        // Only one device is connected at a time: end the previous session first
        if let previous = takeSession() {
            rejectPendingPromises(for: previous.device)
            if previous.device !== espDevice {
                previous.device.disconnect()
            }
        }

        let promise = trackPromise(espDevice: espDevice, resolve: resolve, reject: reject, onSettled: { [weak self] in
            self?.withState { self?.isConnecting = false }
        })
        // The SDK may never call back (#56), which would block every later connect
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
            promise.reject("error", "Device connection timed out.")
        }
        // ESPBleTransport queues requests and never fails the in-flight one on disconnect, so a
        // transport can stay stuck. The JS connect() calls createESPDevice first, which gives the
        // device a fresh transport, so never connect the same ESPDevice twice without it.
        espDevice.bleDelegate = DisconnectObserver(module: self, espDevice: espDevice)
        espDevice.connect(completionHandler: { [weak self] status in
            switch status {
            case .connected:
                // Resolve first: a connect that was already rejected must not take over the session
                if promise.resolve(["status": "connected"]) {
                    self?.withState {
                        self?.connectedDeviceName = deviceName
                        self?.connectedDevice = espDevice
                    }
                }
            case .failedToConnect(let error):
                promise.reject("error", error.description)
            case .disconnected:
                promise.reject(EspIdfProvisioning.deviceDisconnectedErrorCode, "Device disconnected.")
            }
        })
    }

    @objc(sendData:path:data:resolve:reject:)
    func sendData(deviceName: String, path: String, data: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let data: Data = data.data(using: .utf8)!
        if let data = Data(base64Encoded: data) {
            let promise = trackPromise(espDevice: espDevice, resolve: resolve, reject: reject)
            guard isConnected(deviceName: deviceName, espDevice: espDevice) else {
                promise.reject(EspIdfProvisioning.deviceDisconnectedErrorCode, "Device is not connected.")
                return
            }

            espDevice.sendData(path: path, data: data, completionHandler: { data, error in
                if error != nil {
                    promise.reject("error", error?.description)
                    return
                }

                promise.resolve(data!.base64EncodedString())
            })
        } else {
            reject("error", "Data is not base64 encoded.",  nil)
        }
    }

    @objc(scanWifiList:resolve:reject:)
    func scanWifiList(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let promise = trackPromise(espDevice: espDevice, resolve: resolve, reject: reject)
        guard isConnected(deviceName: deviceName, espDevice: espDevice) else {
            promise.reject(EspIdfProvisioning.deviceDisconnectedErrorCode, "Device is not connected.")
            return
        }

        espDevice.scanWifiList(completionHandler: { wifiList, error in
            if error != nil {
                if error?.code == ESPWiFiScanError.emptyResultCount.code {
                  promise.resolve([])
                }

                // A result may still follow the error, so only reject if none arrives. See
                // https://github.com/orbital-systems/react-native-esp-idf-provisioning/issues/22
                // and https://github.com/espressif/esp-idf-provisioning-ios/issues/74
                DispatchQueue.main.asyncAfter(deadline: .now() + 10) {
                    promise.reject("error", error?.description)
                }
                return
            }

            promise.resolve(wifiList!.map {[
                "ssid": $0.ssid,
                "bssid": $0.bssid.toHexString(),
                "rssi": $0.rssi,
                "auth": $0.auth.rawValue,
                "channel": $0.channel
            ]})
        })
    }

    @objc(disconnect:)
    func disconnect(deviceName: String) {
        // Clear the session first so the resulting disconnect isn't reported as unexpected
        guard let espDevice = takeSession(where: { name, _ in name == deviceName })?.device ?? self.espDevices[deviceName] else {
            return
        }

        rejectPendingPromises(for: espDevice)
        espDevice.disconnect()
    }

    @objc(provision:ssid:passphrase:resolve:reject:)
    func provision(deviceName: String, ssid: String, passphrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let promise = trackPromise(espDevice: espDevice, resolve: resolve, reject: reject)
        guard isConnected(deviceName: deviceName, espDevice: espDevice) else {
            promise.reject(EspIdfProvisioning.deviceDisconnectedErrorCode, "Device is not connected.")
            return
        }

        espDevice.provision(ssid: ssid, passPhrase: passphrase, completionHandler: { status in
            switch status {
            case .success:
                promise.resolve([
                    "status": "success"
                ])
            case .failure(let error):
                promise.reject("error", error.description)
            case .configApplied:
                break
            }
        })
    }

    @objc(getProofOfPossession:resolve:reject:)
    func getProofOfPossession(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        espDevice.delegate?.getProofOfPossesion(forDevice: espDevice, completionHandler: { proofOfPossession in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            resolve(proofOfPossession)
            invoked = true
        })
    }
    
    @objc(setProofOfPossession:proofOfPossession:resolve:reject:)
    func setProofOfPossession(deviceName: String, proofOfPossession: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        // Need to recreate the device to set proof of possession
        createESPDevice(deviceName: deviceName, transport: espDevice.transport.rawValue, security: espDevice.security.rawValue, proofOfPossession: proofOfPossession, softAPPassword: softAPPasswords[deviceName], username: espDevice.username, resolve: resolve, reject: reject)
    }
    
    @objc(getUsername:resolve:reject:)
    func getUsername(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        espDevice.delegate?.getUsername(forDevice: espDevice, completionHandler: { userName in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            resolve(userName)
            invoked = true
        })
    }
    
    @objc(setUsername:username:resolve:reject:)
    func setUsername(deviceName: String, username: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice.username = username
    }
    
    @objc(getDeviceName:resolve:reject:)
    func getDeviceName(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        resolve(espDevice.name)
    }
    
    @objc(setDeviceName:newDeviceName:resolve:reject:)
    func setDeviceName(deviceName: String, newDeviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        // No-op: Can't change device name on iOS
        resolve(newDeviceName)
    }
    
    @objc(getPrimaryServiceUuid:resolve:reject:)
    func getPrimaryServiceUuid(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        // No-op: primaryServiceUuid does not exist on iOS
        resolve("")
    }
    
    @objc(setPrimaryServiceUuid:primaryServiceUuid:resolve:reject:)
    func setPrimaryServiceUuid(deviceName: String, primaryServiceUuid: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        // No-op: primaryServiceUuid does not exist on iOS
        resolve("")
    }
    
    @objc(getSecurityType:resolve:reject:)
    func getSecurityType(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        resolve(espDevice.security.rawValue)
    }
    
    @objc(setSecurityType:security:resolve:reject:)
    func setSecurityType(deviceName: String, security: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let security = ESPSecurity(rawValue: security)
        espDevice.security = security
    }
    
    @objc(getTransportType:resolve:reject:)
    func getTransportType(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        resolve(espDevice.transport.rawValue)
    }
    
    @objc(getVersionInfo:resolve:reject:)
    func getVersionInfo(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        resolve(espDevice.versionInfo)
    }
    
    @objc(getDeviceCapabilities:resolve:reject:)
    func getDeviceCapabilities(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        resolve(espDevice.capabilities)
    }
}
