//
//  Screenshot+UserDefaults.swift
//  OpenSiri
//
//  Created by tisfeng on 2025/3/17.
//  Copyright © 2025 izual. All rights reserved.
//

import Foundation

// MARK: - UserDefaults Properties

extension Screenshot {
    // MARK: - UserDefaults keys

    /// Last screenshot rect key
    private var lastScreenshotRectKey: String {
        "opensiri.screenshot.lastScreenshotRect"
    }

    /// Last screen key
    private var lastScreenKey: String {
        "opensiri.screenshot.lastScreen"
    }

    /// Last screen frame key
    private var lastScreenFrameKey: String {
        "opensiri.screenshot.lastScreenFrame"
    }

    /// Last screenshot rectangle, persisted in UserDefaults
    @objc public var lastScreenshotRect: CGRect {
        get {
            let defaults = UserDefaults.standard
            guard let rectString = defaults.string(forKey: lastScreenshotRectKey) else {
                return .zero
            }
            return NSRectFromString(rectString)
        }
        set {
            let defaults = UserDefaults.standard
            let rectString = NSStringFromRect(newValue)
            defaults.set(rectString, forKey: lastScreenshotRectKey)
        }
    }

    @objc public var lastScreen: NSScreen? {
        get {
            let defaults = UserDefaults.standard
            guard let screenDescription = defaults.string(forKey: lastScreenKey) else {
                return nil
            }
            return NSScreen.screens.first { $0.deviceDescriptionString == screenDescription }
        }
        set {
            let defaults = UserDefaults.standard
            let screenDescription = newValue?.deviceDescriptionString
            defaults.set(screenDescription, forKey: lastScreenKey)
        }
    }

    @objc public var lastScreenFrame: NSRect {
        get {
            let defaults = UserDefaults.standard
            guard let frameString = defaults.string(forKey: lastScreenFrameKey) else {
                return .zero
            }
            return NSRectFromString(frameString)
        }
        set {
            let defaults = UserDefaults.standard
            let frameString = NSStringFromRect(newValue)
            defaults.set(frameString, forKey: lastScreenFrameKey)
        }
    }
}
