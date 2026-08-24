//
//  EZLinkParser.h
//  OpenSiri
//
//  Created by tisfeng on 2023/2/25.
//  Copyright © 2023 izual. All rights reserved.
//

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// OpenSiri Scheme: opensiri://
static NSString *const EZAppScheme = @"opensiri";
static NSString *const EZAppDebugScheme = @"opensirid";

static NSString *const EZWriteKeyValueKey = @"writeKeyValue";
static NSString *const EZReadValueOfKeyKey = @"readValueOfKey";
static NSString *const EZSaveUserDefaultsDataToDownloadFolderKey = @"saveUserDefaultsDataToDownloadFolder";
static NSString *const EZResetUserDefaultsDataKey = @"resetUserDefaultsData";

static NSString *const EZQueryKey = @"query";

@interface EZSchemeParser : NSObject

// Check if text started with opensiri://
- (BOOL)isOpenSiriScheme:(NSString *)text;

/// Open OpenSiri URL Schema.
- (void)openURLScheme:(NSString *)URLScheme completion:(void (^)(BOOL isSuccess, NSString *_Nullable returnValue, NSString *_Nullable actionKey))completion;

- (BOOL)isWriteActionKey:(NSString *)actionKey;

@end

NS_ASSUME_NONNULL_END
