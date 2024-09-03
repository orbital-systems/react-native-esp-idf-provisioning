#ifdef RCT_NEW_ARCH_ENABLED
#import <RNEspIdfProvisioningSpec/RNEspIdfProvisioningSpec.h>
#else
#import <React/RCTBridgeModule.h>
#endif

@interface RCT_EXTERN_MODULE(EspIdfProvisioning, NSObject)
    RCT_EXTERN_METHOD(searchESPDevices:(NSString *)devicePrefix
                      transport:(NSString *)location
                      security:(NSInteger)security
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(stopESPDevicesSearch)

    RCT_EXTERN_METHOD(createESPDevice:(NSString *)deviceName
                      transport:(NSString *)transport
                      security:(NSInteger)security
                      proofOfPossession:(NSString *)proofOfPossession
                      softAPPassword:(NSString *)softAPPassword
                      username:(NSString *)username
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(connect:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(sendData:(NSString *)deviceName
                      path:(NSString *)path
                      data:(NSString *)data
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(scanWifiList:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(disconnect:(NSString *)deviceName)

    RCT_EXTERN_METHOD(provision:(NSString *)deviceName
                      ssid:(NSString *)ssid
                      passphrase:(NSString *)passphrase
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getProofOfPossession:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(setProofOfPossession:(NSString *)deviceName
                      proofOfPossession:(NSString *)proofOfPossession
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getUsername:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(setUsername:(NSString *)deviceName
                      username:(NSString *)username
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getDeviceName:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(setDeviceName:(NSString *)deviceName
                      newDeviceName:(NSString *)newDeviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getPrimaryServiceUuid:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(setPrimaryServiceUuid:(NSString *)deviceName
                      primaryServiceUuid:(NSString *)primaryServiceUuid
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getSecurityType:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(setSecurityType:(NSString *)deviceName
                      security:(NSInteger)security
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getTransportType:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getVersionInfo:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    RCT_EXTERN_METHOD(getDeviceCapabilities:(NSString *)deviceName
                      resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject)

    + (BOOL) requiresMainQueueSetup {
      return YES;
    }

    // Don't compile this code when we build for the old architecture.
    #ifdef RCT_NEW_ARCH_ENABLED
    - (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
        (const facebook::react::ObjCTurboModule::InitParams &)params
    {
        return std::make_shared<facebook::react::NativeEspIdfProvisioningSpecJSI>(params);
    }
    #endif

@end
