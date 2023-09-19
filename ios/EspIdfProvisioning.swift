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
    var espDevice: ESPDevice?

    @objc(searchESPDevices:transport:security:resolve:reject:)
    func searchESPDevices(devicePrefix: String, transport: String, security: Int, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {

        let transport = ESPTransport(rawValue: transport) ?? ESPTransport.ble
        let security = ESPSecurity(rawValue: security)

        ESPProvisionManager.shared.searchESPDevices(devicePrefix: devicePrefix, transport: transport, security: security) { espDevices, error in
            if error != nil {
                reject("error", error?.description, nil)
                return
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
        }
    }

    @objc(stopESPDevicesSearch)
    func stopESPDevicesSearch() {
        ESPProvisionManager.shared.stopESPDevicesSearch()
    }

    @objc(createESPDevice:transport:security:proofOfPossession:softAPPassword:username:resolve:reject:)
    func createESPDevice(deviceName: String, transport: String, security: Int, proofOfPossession:String? = nil, softAPPassword:String? = nil, username:String? = nil, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let transport = ESPTransport(rawValue: transport) ?? ESPTransport.ble
        let security = ESPSecurity(rawValue: security)

        ESPProvisionManager.shared.createESPDevice(deviceName: deviceName, transport: transport, security: security, proofOfPossession: proofOfPossession, softAPPassword: softAPPassword, username: username) { espDevice, error in
            if error != nil {
                reject("error", error?.description, nil)
                return
            }

            self.espDevice = espDevice

            resolve([
                "name": espDevice!.name,
                "advertisementData": espDevice!.advertisementData ?? [],
                "capabilities": espDevice!.capabilities ?? [],
                "security": espDevice!.security.rawValue,
                "transport": espDevice!.transport.rawValue,
                "username": espDevice!.username as Any,
                "versionInfo": espDevice!.versionInfo ?? {}
            ])
        }
    }

    @objc(connect:reject:)
    func connect(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice?.connect(completionHandler: { status in
            switch status {
            case .connected:
                resolve([
                    "status": "connected"
                ])
            case .failedToConnect(let error):
                reject("error", error.description, nil)
            case .disconnected:
                reject("error", "Device disconnected.", nil)
            }
        })
    }

    @objc(sendData:data:resolve:reject:)
    func sendData(path: String, data: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if self.espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        let data: Data = data.data(using: .utf8)!
        if let data = Data(base64Encoded: data) {
            espDevice?.sendData(path: path, data: data, completionHandler: { data, error in
                if error != nil {
                    reject("error", error?.description, nil)
                    return
                }

                resolve(data!.base64EncodedString())
            })
        } else {
            reject("error", "Data is not base64 encoded.",  nil)
        }
    }

    @objc(isSessionEstablished)
    func isSessionEstablished() -> Bool {
        if self.espDevice == nil {
            return false
        }

        return espDevice!.isSessionEstablished()
    }

    @objc(getProofOfPossesion:reject:)
    func getProofOfPossesion(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice!.delegate?.getProofOfPossesion(forDevice: espDevice!, completionHandler: { proofOfPossesion in
            resolve(proofOfPossesion)
        })
    }

    @objc(scanWifiList:reject:)
    func scanWifiList(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice?.scanWifiList(completionHandler: { wifiList, error in
            if error != nil {
                reject("error", error?.description, nil)
                return
            }

            resolve(wifiList!.map {[
                "ssid": $0.ssid,
                "bssid": $0.bssid,
                "auth": $0.auth.rawValue,
                "channel": $0.channel
            ]})
        })
    }

    @objc(disconnect)
    func disconnect() {
        espDevice?.disconnect()
    }

    @objc(provision:passphrase:resolve:reject:)
    func provision(ssid: String, passphrase: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice!.provision(ssid: ssid, passPhrase: passphrase, completionHandler: { status in
            switch status {
            case .success:
                resolve([
                    "status": "success"
                ])
            case .failure(let error):
                reject("error", error.description, nil)
            case .configApplied:
                resolve(status)
            }
        })
    }

    @objc(initialiseSession:resolve:reject:)
    func initialiseSession(sessionPath: String?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        if espDevice == nil {
            reject("error", "No ESP device found. Call createESPDevice first.", nil)
            return
        }

        espDevice?.initialiseSession(sessionPath: sessionPath, completionHandler: { status in
            switch status {
            case .connected:
                resolve([
                    "status": "connected"
                ])
            case .failedToConnect(let error):
                reject("error", error.description, nil)
            case .disconnected:
                reject("error", "Device disconnected.", nil)
            }
        })
    }
}
