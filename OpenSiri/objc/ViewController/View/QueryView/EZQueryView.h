//
//  EDQueryView.h
//  OpenSiri
//
//  Created by tisfeng on 2022/11/8.
//  Copyright © 2022 izual. All rights reserved.
//

#import "EZTextView.h"
#import "EZLoadingAnimationView.h"
#import "EZAudioButton.h"
#import "NSObject+EZWindowType.h"

@class EZQueryModel;

NS_ASSUME_NONNULL_BEGIN

static CGFloat const EZQueryViewExceptInputViewHeight = EZAudioButtonWidthHeight_24 + EZAudioButtonInputViewTopPadding_4 + EZAudioButtonBottomMargin_4; // 32;

/// Height of the captured conversation thumbnail strip shown above the input text view.
static CGFloat const EZCaptureThumbnailHeight_40 = 40;
static CGFloat const EZCaptureThumbnailBottomPadding_6 = 6;

static NSTimeInterval const EZDelayDetectTextLanguageInterval = 1.0;

@interface EZQueryView : NSView

@property (nonatomic, strong) EZQueryModel *queryModel;
@property (nonatomic, strong) EZTextView *textView;
@property (nonatomic, strong) NSScrollView *scrollView;
@property (nonatomic, strong) EZLoadingAnimationView *loadingAnimationView;
@property (nonatomic, copy) NSString *placeholderText;
@property (nonatomic, copy) NSString *alertText;

@property (nonatomic, strong) EZAudioButton *audioButton;

/// Thumbnail of the most recent conversation capture, shown above the input text view.
/// Set to nil to hide the strip.
@property (nonatomic, strong, nullable) NSImage *captureThumbnailImage;

/// Invoked when the user clicks the capture thumbnail.
@property (nonatomic, copy, nullable) void (^captureThumbnailClickBlock)(void);

/// Name of the recognized mode shown in the bottom-left chip, e.g. the localized
/// "WeChat chat". The chip renders it as "Detected <name>", matching the language chip.
/// Set to nil to hide the chip.
@property (nonatomic, copy, nullable) NSString *smartScreenshotModeName;

/// Whether the conversation reading is currently applied, used for the chip menu's checkmark.
@property (nonatomic, assign) BOOL smartScreenshotUsingConversation;

/// Invoked when the user picks a reading from the chip menu.
@property (nonatomic, copy, nullable) void (^smartScreenshotModeChangeBlock)(BOOL useConversation);

/// Invoked when the user picks "edit recognition result" from the chip menu.
@property (nonatomic, copy, nullable) void (^smartScreenshotEditBlock)(void);

@property (nonatomic, assign) BOOL clearButtonHidden;
@property (nonatomic, assign) BOOL isTypingChinese;

@property (nonatomic, copy) void (^enterActionBlock)(NSString *text);

@property (nonatomic, copy) void (^playAudioBlock)(NSString *text);
@property (nonatomic, copy) void (^copyTextBlock)(NSString *text);
@property (nonatomic, copy) void (^detectActionBlock)(NSButton *button);
@property (nonatomic, copy) void (^clearBlock)(NSString *text);
@property (nonatomic, copy) void (^pasteTextBlock)(NSString *text);

@property (nonatomic, copy) void (^updateInputTextBlock)(NSString *text, CGFloat queryViewHeight);
@property (nonatomic, copy) void (^selectedLanguageBlock)(EZLanguage language);


- (CGFloat)heightOfQueryView;

- (void)initializeAimatedButtonAlphaValue:(EZQueryModel *)queryModel;

- (void)startLoadingAnimation:(BOOL)isLoading;
- (void)setAlertTextHidden:(BOOL)hidden;

/// Highlight all links in textstorage
- (void)highlightAllLinks;

/// Remove all links in textstorage.
- (void)removeAllLinks;

- (void)scrollToEndOfTextView;

/// Cancel the pending auto-query-while-typing debounce.
- (void)cancelAutoQuery;

@end

NS_ASSUME_NONNULL_END
