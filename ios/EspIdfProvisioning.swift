//
//  EspIdfProvisioning.swift
//  react-native-esp-idf-provisioning
//
//  Created by Mateo Gianolio on 2023-09-18.
//

import Foundation
import ESPProvision

@objc(EspIdfProvisioning)
class EspIdfProvisioning: NSObject {
    // Think we need to keep a dictionary of espDevices since we can't pass native
    // classes to react-native
    var espDevices: [String : ESPDevice] = [:]

    @objc(searchESPDevices:transport:security:resolve:reject:)
    func searchESPDevices(devicePrefix: String, transport: String, security: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let transport = ESPTransport(rawValue: transport) ?? ESPTransport.ble
        let security = ESPSecurity(rawValue: security)

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
                "advertisementData": $0.advertisementData ?? [],
                "capabilities": $0.capabilities ?? [],
                "security": $0.security.rawValue,
                "transport": $0.transport.rawValue,
                "username": $0.username as Any,
                "versionInfo": $0.versionInfo ?? {}
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

            self.espDevices[espDevice!.name] = espDevice

            resolve([
                "name": espDevice!.name,
                "advertisementData": espDevice!.advertisementData ?? [],
                "capabilities": espDevice!.capabilities ?? [],
                "security": espDevice!.security.rawValue,
                "transport": espDevice!.transport.rawValue,
                "username": espDevice!.username as Any,
                "versionInfo": espDevice!.versionInfo ?? {}
            ])
            invoked = true
        }
    }

    @objc(connect:resolve:reject:)
    func connect(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        espDevices[deviceName]!.connect(completionHandler: { status in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            switch status {
            case .connected:
                resolve([
                    "status": "connected"
                ])
                invoked = true
            case .failedToConnect(let error):
                reject("error", error.description, nil)
                invoked = true
            case .disconnected:
                reject("error", "Device disconnected.", nil)
                invoked = true
            }
        })
    }

    @objc(sendData:path:data:resolve:reject:)
    func sendData(deviceName: String, path: String, data: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let data: Data = data.data(using: .utf8)!
        if let data = Data(base64Encoded: data) {
            var invoked = false
            self.espDevices[deviceName]!.sendData(path: path, data: data, completionHandler: { data, error in
                // Prevent multiple callback invokation error
                guard !invoked else { return }

                if error != nil {
                    reject("error", error?.description, nil)
                    invoked = true
                    return
                }

                resolve(data!.base64EncodedString())
                invoked = true
            })
        } else {
            reject("error", "Data is not base64 encoded.",  nil)
        }
    }

    @objc(isSessionEstablished:)
    func isSessionEstablished(deviceName: String) -> Bool {
        if self.espDevices[deviceName] == nil {
            return false
        }

        return self.espDevices[deviceName]!.isSessionEstablished()
    }

    @objc(getProofOfPossession:resolve:reject:)
    func getProofOfPossession(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        self.espDevices[deviceName]!.delegate?.getProofOfPossesion(forDevice: self.espDevices[deviceName]!, completionHandler: { proofOfPossession in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            resolve(proofOfPossession)
            invoked = true
        })
    }

    @objc(scanWifiList:resolve:reject:)
    func scanWifiList(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        self.espDevices[deviceName]!.scanWifiList(completionHandler: { wifiList, error in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            if error != nil {
                // Ignore error as per https://github.com/orbital-systems/react-native-esp-idf-provisioning/issues/22
                // and https://github.com/espressif/esp-idf-provisioning-ios/issues/74
                return
            }

            resolve(wifiList!.map {[
                "ssid": $0.ssid,
                "bssid": $0.bssid.toHexString(),
                "rssi": $0.rssi,
                "auth": $0.auth.rawValue,
                "channel": $0.channel
            ]})
            invoked = true
        })
    }

    @objc(disconnect:)
    func disconnect(deviceName: String) {
        self.espDevices[deviceName]?.disconnect()
    }

    @objc(provision:ssid:passphrase:resolve:reject:)
    func provision(deviceName: String, ssid: String, passphrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        self.espDevices[deviceName]!.provision(ssid: ssid, passPhrase: passphrase, completionHandler: { status in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            switch status {
            case .success:
                resolve([
                    "status": "success"
                ])
                invoked = true
            case .failure(let error):
                reject("error", error.description, nil)
                invoked = true
            case .configApplied:
                break
            }
        })
    }

    @objc(initialiseSession:sessionPath:resolve:reject:)
    func initialiseSession(deviceName: String, sessionPath: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevices[deviceName] == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        self.espDevices[deviceName]!.initialiseSession(sessionPath: sessionPath, completionHandler: { status in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            switch status {
            case .connected:
                resolve([
                    "status": "connected"
                ])
                invoked = true
            case .failedToConnect(let error):
                reject("error", error.description, nil)
                invoked = true
            case .disconnected:
                reject("error", "Device disconnected.", nil)
                invoked = true
            }
        })
    }
}
