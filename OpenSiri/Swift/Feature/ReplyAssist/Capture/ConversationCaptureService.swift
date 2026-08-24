//
//  ConversationCaptureService.swift
//  OpenSiri
//
//  Created by openSiri on 2026/8/22.
//

import AppKit
import Foundation

// MARK: - ConversationInterpretation

/// How the current screenshot's text is being presented in the query input.
@objc
enum ConversationInterpretation: Int {
    /// The merged OCR text, exactly as the normal screenshot pipeline produced it.
    case plainText
    /// The text rebuilt from the structured conversation, with speaker labels.
    case conversation
}

// MARK: - ConversationCaptureService

/// Backs the conversation half of the Smart Screenshot feature.
///
/// The screenshot pipeline stays in charge of capture and of the OCR text that lands in the
/// query input. Once that text is in place this service takes the same image, re-recognizes it
/// with geometry intact, and decides whether it looks like a WeChat conversation. Detection is
/// deliberately after the fact so it never delays the text appearing.
///
/// The screenshot itself never leaves this object; only ``ConversationSnapshot`` is structured
/// for later use.
@objc(EZConversationCaptureService)
@MainActor
class ConversationCaptureService: NSObject {
    // MARK: Internal

    @objc static let shared = ConversationCaptureService()

    /// The screenshot behind the current query, kept on device for the thumbnail and review window.
    @objc private(set) var image: NSImage?

    /// The structured conversation, or nil when the capture did not look like one.
    private(set) var snapshot: ConversationSnapshot?

    /// The merged OCR text, so switching back to plain text restores exactly what OCR produced.
    private(set) var plainText: String = ""

    /// Which reading is currently shown in the query input.
    @objc private(set) var interpretation: ConversationInterpretation = .plainText

    /// Whether the capture was recognized as a WeChat conversation.
    @objc var isConversationDetected: Bool {
        snapshot?.appHint == .wechat
    }

    /// The conversation rendered as labelled lines, matching what the review window copies.
    @objc var labelledText: String {
        guard let snapshot else { return plainText }
        let me = String(localized: "reply_assist.speaker.me")
        let peer = String(localized: "reply_assist.speaker.peer")
        return snapshot.dialogueMessages
            .map { "\($0.speaker == .me ? me : peer): \($0.text)" }
            .joined(separator: "\n")
    }

    /// The text the query input should show for the current interpretation.
    @objc var resolvedText: String {
        switch interpretation {
        case .plainText: plainText
        case .conversation: labelledText
        }
    }

    /// Starts a fresh capture, clearing any previous detection.
    ///
    /// Called by the screenshot pipeline as soon as an image is in hand, so a stale chip from
    /// the previous capture never lingers over new text.
    @objc
    func beginCapture(image: NSImage) {
        self.image = image
        snapshot = nil
        plainText = ""
        interpretation = .plainText
        notifyChanged()
    }

    /// Runs conversation detection on the current capture.
    ///
    /// The completion always runs, including on failure, so the caller can settle the query
    /// input and fire its query exactly once instead of querying the plain text and then
    /// querying again once the structured reading arrives.
    ///
    /// - Parameters:
    ///   - plainText: The merged OCR text already shown in the query input.
    ///   - completion: Runs on the main actor once the interpretation is final.
    @objc
    func detectConversation(plainText: String, completion: (() -> ())?) {
        guard let image else {
            completion?()
            return
        }
        self.plainText = plainText

        Task { [weak self] in
            guard let self else {
                completion?()
                return
            }
            do {
                let observations = try await ocrEngine.recognizeObservations(image: image)
                let parsed = parser.parse(observations: observations)

                // A capture that arrived while OCR was running wins; drop this stale result.
                guard self.image === image else { return }

                snapshot = parsed.appHint == .wechat ? parsed : nil
                // Detection succeeding is itself the claim the chip reports.
                interpretation = snapshot == nil ? .plainText : .conversation
                logInfo(
                    "Smart screenshot detection: hint \(parsed.appHint.rawValue), "
                        + "\(parsed.messages.count) messages, \(parsed.needsReviewCount) need review"
                )
                notifyChanged()
            } catch {
                logError("Conversation detection failed: \(error)")
            }
            completion?()
        }
    }

    /// Switches how the capture is read.
    ///
    /// Named `apply` rather than `set` because `setInterpretation:` is already the selector of
    /// the `interpretation` property's setter.
    @objc
    func apply(interpretation: ConversationInterpretation) {
        guard self.interpretation != interpretation else { return }
        // Without a conversation there is nothing to switch to.
        guard interpretation == .plainText || snapshot != nil else { return }
        self.interpretation = interpretation
        notifyChanged()
    }

    /// Opens the review window for the detected conversation.
    @objc
    func showReviewWindow() {
        guard let snapshot, let image else {
            logInfo("No conversation to review")
            return
        }
        ConversationReviewWindowController.shared.show(snapshot: snapshot, image: image)
    }

    /// Replaces the snapshot after the user edits it in the review window.
    func update(snapshot: ConversationSnapshot) {
        self.snapshot = snapshot
        notifyChanged()
    }

    /// Clears the capture and its screenshot.
    @objc
    func reset() {
        image = nil
        snapshot = nil
        plainText = ""
        interpretation = .plainText
        notifyChanged()
    }

    // MARK: Private

    private let ocrEngine = AppleOCREngine()
    private let parser = WeChatConversationParser()

    private func notifyChanged() {
        NotificationCenter.default.post(name: .conversationCaptureDidUpdate, object: self)
    }
}
