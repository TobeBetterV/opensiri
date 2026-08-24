//
//  ConversationSnapshot.swift
//  OpenSiri
//
//  Created by openSiri on 2026/8/22.
//

import Foundation

// MARK: - ConversationSpeaker

/// Who sent a message, inferred from its horizontal placement in the screenshot.
enum ConversationSpeaker: String, Codable, Sendable, CaseIterable {
    /// Sent by the user. Right aligned in a WeChat conversation.
    case me
    /// Sent by the other party. Left aligned.
    case peer
    /// Centered chrome such as timestamps or "message recalled" notices.
    case system
    /// Placement was ambiguous, so a human should confirm before the text is used.
    case unknown
}

// MARK: - ConversationMessage

/// One bubble of a captured conversation.
struct ConversationMessage: Identifiable, Codable, Equatable, Sendable {
    // MARK: Lifecycle

    init(
        id: UUID = UUID(),
        speaker: ConversationSpeaker,
        text: String,
        boundingBox: CGRect,
        confidence: Float,
        needsReview: Bool
    ) {
        self.id = id
        self.speaker = speaker
        self.text = text
        self.boundingBox = boundingBox
        self.confidence = confidence
        self.needsReview = needsReview
    }

    // MARK: Internal

    let id: UUID

    var speaker: ConversationSpeaker

    var text: String

    /// Union of the bubble's OCR observations, in normalized Vision coordinates.
    ///
    /// Origin is bottom-left and both axes run 0...1, so the value stays meaningful
    /// regardless of the captured image's pixel size.
    let boundingBox: CGRect

    /// Lowest confidence among the observations merged into this message.
    let confidence: Float

    /// Set when the speaker was ambiguous or the confidence fell below the trusted threshold.
    var needsReview: Bool
}

// MARK: - ConversationSnapshot

/// A structured conversation parsed out of a single screenshot.
///
/// Deliberately holds no `NSImage`: the snapshot is the part that may later travel to an
/// agent, while the original screenshot stays on device. The image is carried separately by
/// ``ConversationCaptureService``.
struct ConversationSnapshot: Codable, Equatable, Sendable {
    /// Which app the screenshot appears to come from.
    enum AppHint: String, Codable, Sendable {
        case wechat
        case unknown
    }

    let capturedAt: Date

    let appHint: AppHint

    /// Messages in visual order, top to bottom.
    var messages: [ConversationMessage]

    /// Messages excluding centered chrome such as timestamps.
    var dialogueMessages: [ConversationMessage] {
        messages.filter { $0.speaker == .me || $0.speaker == .peer }
    }

    var needsReviewCount: Int {
        messages.filter(\.needsReview).count
    }

    /// Mean OCR confidence across all messages, or 0 when empty.
    var overallConfidence: Float {
        guard !messages.isEmpty else { return 0 }
        return messages.map(\.confidence).reduce(0, +) / Float(messages.count)
    }

    var isEmpty: Bool {
        messages.isEmpty
    }
}
