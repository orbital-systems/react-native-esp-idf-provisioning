package com.espidfprovisioning

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

abstract class EspIdfProvisioningSpec(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {
    abstract fun searchESPDevices(devicePrefix: String, transport: String, security: Int, promise: Promise?)
    abstract fun stopESPDevicesSearch()
    abstract fun createESPDevice(deviceName: String, transport: String, security: Int, proofOfPossesion: String?, softAPPassword: String?, username: String?, promise: Promise?)
    abstract fun connect(deviceName: String, promise: Promise?)
    abstract fun sendData(deviceName: String, path: String, data: String, promise: Promise?)
    abstract fun getProofOfPossesion(deviceName: String, promise: Promise?)
    abstract fun scanWifiList(deviceName: String, promise: Promise?)
    abstract fun disconnect(deviceName: String)
    abstract fun provision(deviceName: String, ssid: String, passphrase: String, promise: Promise?)
    abstract fun initializeSession(deviceName: String, sessionPath: String, promise: Promise?)
}
