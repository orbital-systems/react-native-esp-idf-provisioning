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
    private var espDevices: [String : ESPDevice] = [:]
    private var softAPPasswords: [String : String] = [:]

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

        var invoked = false
        espDevice.connect(completionHandler: { status in
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
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let data: Data = data.data(using: .utf8)!
        if let data = Data(base64Encoded: data) {
            var invoked = false
            espDevice.sendData(path: path, data: data, completionHandler: { data, error in
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

    @objc(scanWifiList:resolve:reject:)
    func scanWifiList(deviceName: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        espDevice.scanWifiList(completionHandler: { wifiList, error in
            // Prevent multiple callback invokation error
            guard !invoked else { return }

            if error != nil {
                if error?.code == ESPWiFiScanError.emptyResultCount.code {
                  resolve([])
                }

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
        guard let espDevice = self.espDevices[deviceName] else {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        var invoked = false
        espDevice.provision(ssid: ssid, passPhrase: passphrase, completionHandler: { status in
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
