#import <React/RCTBridgeModule.h>

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
                      address:(NSString *)address
                      primaryServiceUuid:(NSString *)primaryServiceUuid
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

    RCT_EXTERN_METHOD(isSessionEstablished:(NSString *)deviceName)

    RCT_EXTERN_METHOD(getProofOfPossesion:(NSString *)deviceName
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

    RCT_EXTERN_METHOD(initialiseSession:(NSString *)deviceName
                      sessionPath(NSString *)sessionPath
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
