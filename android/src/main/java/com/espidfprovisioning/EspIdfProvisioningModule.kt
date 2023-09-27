package com.espidfprovisioning

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanResult
import android.content.Context
import com.espressif.provisioning.DeviceConnectionEvent;
import com.espressif.provisioning.ESPConstants
import com.espressif.provisioning.ESPDevice
import com.espressif.provisioning.ESPProvisionManager
import com.espressif.provisioning.WiFiAccessPoint
import com.espressif.provisioning.listeners.BleScanListener
import com.espressif.provisioning.listeners.ProvisionListener
import com.espressif.provisioning.listeners.ResponseListener
import com.espressif.provisioning.listeners.WiFiScanListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import org.greenrobot.eventbus.EventBus
import org.greenrobot.eventbus.Subscribe
import org.greenrobot.eventbus.ThreadMode
import java.lang.Exception
import java.util.ArrayList
import java.util.Base64

class EspIdfProvisioningModule internal constructor(context: ReactApplicationContext?) : EspIdfProvisioningSpec(context) {
  override fun getName(): String {
    return NAME
  }

  companion object {
      const val NAME = "EspIdfProvisioning"
  }

  private val espProvisionManager = ESPProvisionManager.getInstance(context)
  private val espDevices = HashMap<String, ESPDevice>()
  private val bluetoothAdapter = (context?.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun searchESPDevices(devicePrefix: String, transport: String, security: Int, promise: Promise?) {
    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    espDevices.clear()

    espProvisionManager.searchBleEspDevices(devicePrefix, object : BleScanListener {
      override fun scanStartFailed() {
        promise?.reject(Error("Scan could not be started."))
      }

      override fun onPeripheralFound(device: BluetoothDevice?, scanResult: ScanResult?) {
        // Can this happen?
        if (device == null) {
          return
        }

        val deviceName = scanResult?.scanRecord?.deviceName

        // No device name
        if (deviceName?.isNullOrEmpty() == true) {
          return
        }

        var serviceUuid: String? = null
        if (scanResult?.scanRecord?.serviceUuids != null && scanResult.scanRecord?.serviceUuids?.size!! > 0) {
          serviceUuid = scanResult.scanRecord?.serviceUuids?.get(0).toString()
        }

        if (serviceUuid != null && !espDevices.containsKey(deviceName)) {
          val espDevice = ESPDevice(reactApplicationContext, transportEnum, securityEnum)
          espDevice.bluetoothDevice = device
          espDevice.deviceName = deviceName
          espDevice.primaryServiceUuid = serviceUuid
          espDevices[deviceName] = espDevice
        }
      }

      override fun scanCompleted() {
        val resultArray = Arguments.createArray()

        espDevices.values.forEach { espDevice ->
          val resultMap = Arguments.createMap()
          resultMap.putString("name", espDevice.deviceName)
          resultMap.putArray("capabilities", Arguments.fromList(espDevice.deviceCapabilities))
          resultMap.putInt("security", security)
          resultMap.putString("transport", transport)
          resultMap.putString("username", espDevice.userName)
          resultMap.putString("versionInfo", espDevice.versionInfo)
          resultMap.putString("address", espDevice.bluetoothDevice.address)
          resultMap.putString("primaryServiceUuid", espDevice.primaryServiceUuid)

          resultArray.pushMap(resultMap)
        }

        promise?.resolve(resultArray)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun stopESPDevicesSearch() {
    espProvisionManager.stopBleScan()
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun createESPDevice(
    deviceName: String,
    transport: String,
    security: Int,
    address: String?,
    primaryServiceUuid: String?,
    proofOfPossesion: String?,
    softAPPassword: String?,
    username: String?,
    promise: Promise?
  ) {
    val transportEnum = when (transport) {
      "softap" -> ESPConstants.TransportType.TRANSPORT_SOFTAP
      "ble" -> ESPConstants.TransportType.TRANSPORT_BLE
      else -> ESPConstants.TransportType.TRANSPORT_BLE
    }
    val securityEnum = when (security) {
      0 -> ESPConstants.SecurityType.SECURITY_0
      1 -> ESPConstants.SecurityType.SECURITY_1
      2 -> ESPConstants.SecurityType.SECURITY_2
      else -> ESPConstants.SecurityType.SECURITY_2
    }

    val espDevice = espProvisionManager.createESPDevice(transportEnum, securityEnum)

    espDevice.bluetoothDevice = bluetoothAdapter.getRemoteDevice(address)
    espDevice.deviceName = deviceName
    espDevice.proofOfPossession = proofOfPossesion
    espDevice.primaryServiceUuid = primaryServiceUuid

    espDevices[deviceName] = espDevice

    val result = Arguments.createMap()
    result.putString("name", espDevice?.deviceName)
    result.putArray("capabilities", Arguments.fromList(espDevice?.deviceCapabilities))
    result.putInt("security", security)
    result.putString("transport", transport)
    result.putString("username", espDevice?.userName)
    result.putString("versionInfo", espDevice?.versionInfo)
    result.putString("address", address)
    result.putString("primaryServiceUuid", primaryServiceUuid)

    promise?.resolve(result)
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  override fun connect(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.connectToDevice()

    EventBus.getDefault().register(object {
      @Subscribe(threadMode = ThreadMode.MAIN)
      fun onEvent(event: DeviceConnectionEvent) {
        when (event.eventType) {
          ESPConstants.EVENT_DEVICE_CONNECTED -> {
            val result = Arguments.createMap()
            result.putString("status", "connected")
            promise?.resolve(result)
          }
          ESPConstants.EVENT_DEVICE_CONNECTION_FAILED -> {
            promise?.reject(Error("Device connection failed."))
          }
          else -> {
            // Do nothing
          }
        }

        // Unregister event listener after 1 event received
        EventBus.getDefault().unregister(this)
      }
    })
  }

  @ReactMethod
  override fun sendData(deviceName: String, path: String, data: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    val data = Base64.getDecoder().decode(data)
    espDevices[deviceName]!!.sendDataToCustomEndPoint(path, data, object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val returnData = Base64.getEncoder().encode(returnData).toString(Charsets.UTF_8)
        promise?.resolve(returnData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun getProofOfPossesion(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    promise?.resolve(espDevices[deviceName]!!.proofOfPossession)
  }

  @ReactMethod
  override fun scanWifiList(deviceName: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.scanNetworks(object : WiFiScanListener {
      override fun onWifiListReceived(wifiList: ArrayList<WiFiAccessPoint>?) {
        val resultArray = Arguments.createArray()

        wifiList!!.forEach { item ->
          val resultMap = Arguments.createMap()
          resultMap.putString("ssid", item.wifiName)
          resultMap.putInt("auth", item.security)

          resultArray.pushMap(resultMap)
        }

        promise?.resolve(resultArray)
      }

      override fun onWiFiScanFailed(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun disconnect(deviceName: String) {
    espDevices[deviceName]?.disconnectDevice()
  }

  @ReactMethod
  override fun provision(deviceName: String, ssid: String, passphrase: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.provision(ssid, passphrase, object : ProvisionListener {
      override fun createSessionFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun wifiConfigSent() {
        return
      }

      override fun wifiConfigFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun wifiConfigApplied() {
        return
      }

      override fun wifiConfigApplyFailed(e: Exception?) {
        promise?.reject(e)
      }

      override fun provisioningFailedFromDevice(failureReason: ESPConstants.ProvisionFailureReason?) {
        promise?.reject(Error(failureReason.toString()))
      }

      override fun deviceProvisioningSuccess() {
        val result = Arguments.createMap()
        result.putString("status", "success")
        promise?.resolve(result)
      }

      override fun onProvisioningFailed(e: Exception?) {
        promise?.reject(e)
      }
    })
  }

  @ReactMethod
  override fun initializeSession(deviceName: String, sessionPath: String, promise: Promise?) {
    if (espDevices[deviceName] == null) {
      promise?.reject(Error("No ESP device found. Call createESPDevice first."))
      return
    }

    espDevices[deviceName]!!.initSession(object : ResponseListener {
      override fun onSuccess(returnData: ByteArray?) {
        val returnData = Base64.getEncoder().encode(returnData)
        promise?.resolve(returnData)
      }

      override fun onFailure(e: Exception?) {
        promise?.reject(e)
      }
    })
  }
}
