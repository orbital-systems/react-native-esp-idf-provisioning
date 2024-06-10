package com.espidfprovisioning

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

abstract class EspIdfProvisioningSpec(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {
    abstract fun searchESPDevices(devicePrefix: String, transport: String, security: Int, promise: Promise?)
    abstract fun stopESPDevicesSearch()
    abstract fun createESPDevice(deviceName: String, transport: String, security: Int, proofOfPossession: String?, softAPPassword: String?, username: String?, promise: Promise?)
    abstract fun connect(deviceName: String, promise: Promise?)
    abstract fun sendData(deviceName: String, path: String, data: String, promise: Promise?)
    abstract fun scanWifiList(deviceName: String, promise: Promise?)
    abstract fun disconnect(deviceName: String)
    abstract fun provision(deviceName: String, ssid: String, passphrase: String, promise: Promise?)
    abstract fun getProofOfPossession(deviceName: String, promise: Promise?)
    abstract fun setProofOfPossession(deviceName: String, proofOfPossession: String, promise: Promise?)
    abstract fun getUsername(deviceName: String, promise: Promise?)
    abstract fun setUsername(deviceName: String, username: String, promise: Promise?)
    abstract fun getDeviceName(deviceName: String, promise: Promise?)
    abstract fun setDeviceName(deviceName: String, newDeviceName: String, promise: Promise?)
    abstract fun getPrimaryServiceUuid(deviceName: String, promise: Promise?)
    abstract fun setPrimaryServiceUuid(deviceName: String, primaryServiceUuid: String, promise: Promise?)
    abstract fun getSecurityType(deviceName: String, promise: Promise?)
    abstract fun setSecurityType(deviceName: String, security: Int, promise: Promise?)
    abstract fun getTransportType(deviceName: String, promise: Promise?)
    abstract fun getVersionInfo(deviceName: String, promise: Promise?)
    abstract fun getDeviceCapabilities(deviceName: String, promise: Promise?)
}
