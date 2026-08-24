//
//  ConversationReviewWindowController.swift
//  OpenSiri
//
//  Created by openSiri on 2026/8/22.
//

import AppKit
import SwiftUI

// MARK: - ConversationReviewWindowController

/// Owns the single conversation review window.
///
/// The window is reused across captures so repeated screenshots update in place instead of
/// stacking up windows.
@MainActor
final class ConversationReviewWindowController {
    // MARK: Internal

    static let shared = ConversationReviewWindowController()

    /// Shows the review window, creating it on first use.
    func show(snapshot: ConversationSnapshot, image: NSImage) {
        if let viewModel {
            viewModel.update(snapshot: snapshot, image: image)
        } else {
            createWindow(snapshot: snapshot, image: image)
        }

        NSApplication.shared.activateApp()
        window?.makeKeyAndOrderFront(nil)
    }

    // MARK: Private

    private var window: NSWindow?
    private var viewModel: ConversationReviewViewModel?

    private func createWindow(snapshot: ConversationSnapshot, image: NSImage) {
        let viewModel = ConversationReviewViewModel(snapshot: snapshot, image: image)
        self.viewModel = viewModel

        let hostingController = NSHostingController(
            rootView: ConversationReviewView(viewModel: viewModel)
        )

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 900, height: 560),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = String(localized: "reply_assist.review.title")
        window.contentViewController = hostingController
        window.isReleasedWhenClosed = false
        window.center()

        self.window = window
    }
}
