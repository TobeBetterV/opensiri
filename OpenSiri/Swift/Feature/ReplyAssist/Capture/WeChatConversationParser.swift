//
//  WeChatConversationParser.swift
//  OpenSiri
//
//  Created by openSiri on 2026/8/22.
//

import Foundation

// MARK: - WeChatConversationParser

/// Turns raw OCR observations from a WeChat screenshot into an ordered conversation.
///
/// WeChat lays a conversation out by horizontal alignment rather than by any text marker:
/// the other party's bubbles hug the left edge, the user's hug the right, and chrome such as
/// timestamps sits centered. That geometry is the only signal available from OCR, so the
/// parser groups observations into bubbles by vertical proximity and then classifies each
/// bubble by which edge it favors.
struct WeChatConversationParser {
    // MARK: Internal

    /// Tunables for the geometric heuristics. Values are fractions of the image width or of
    /// the measured line height, so they hold for any capture size.
    struct Configuration: Sendable {
        // MARK: Lifecycle

        init(
            lineGapMultiplier: Double = 1.6,
            centeredTolerance: Double = 0.06,
            maxCenteredWidth: Double = 0.6,
            lowConfidenceThreshold: Float = 0.5
        ) {
            self.lineGapMultiplier = lineGapMultiplier
            self.centeredTolerance = centeredTolerance
            self.maxCenteredWidth = maxCenteredWidth
            self.lowConfidenceThreshold = lowConfidenceThreshold
        }

        // MARK: Internal

        /// A vertical gap wider than this many line heights starts a new bubble.
        let lineGapMultiplier: Double

        /// Left and right margins within this distance of each other count as centered.
        let centeredTolerance: Double

        /// A centered run wider than this fraction of the image is treated as a message,
        /// not as chrome. Real timestamps are short.
        let maxCenteredWidth: Double

        /// Messages at or below this OCR confidence are flagged for review.
        let lowConfidenceThreshold: Float
    }

    var configuration = Configuration()

    /// Parses observations into a snapshot.
    ///
    /// - Parameter observations: Raw OCR observations, in any order.
    /// - Returns: A snapshot whose messages run top to bottom.
    func parse(observations: [EZRecognizedTextObservation]) -> ConversationSnapshot {
        let usable = observations.filter { !$0.firstText.trim().isEmpty }

        guard !usable.isEmpty else {
            return ConversationSnapshot(capturedAt: Date(), appHint: .unknown, messages: [])
        }

        // Vision's origin is bottom-left, so descending maxY walks the image top to bottom.
        let ordered = usable.sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
        let lineHeight = typicalLineHeight(of: ordered)
        let bubbles = groupIntoBubbles(ordered, lineHeight: lineHeight)
        let messages = bubbles.map(makeMessage(from:))

        return ConversationSnapshot(
            capturedAt: Date(),
            appHint: appHint(for: messages),
            messages: messages
        )
    }

    // MARK: Private

    /// Median observation height, used as the scale for vertical gaps.
    ///
    /// The median rather than the mean keeps a single oversized banner or emoji row from
    /// stretching the threshold and merging unrelated bubbles.
    private func typicalLineHeight(of observations: [EZRecognizedTextObservation]) -> Double {
        let heights = observations.map(\.boundingBox.height).sorted()
        guard !heights.isEmpty else { return 0.02 }
        let median = heights[heights.count / 2]
        // Guard against degenerate boxes so the gap threshold stays usable.
        return median > 0 ? median : 0.02
    }

    /// Splits observations into bubbles, breaking on a wide vertical gap or a side change.
    private func groupIntoBubbles(
        _ observations: [EZRecognizedTextObservation],
        lineHeight: Double
    )
        -> [[EZRecognizedTextObservation]] {
        var bubbles: [[EZRecognizedTextObservation]] = []
        var current: [EZRecognizedTextObservation] = []
        let maxGap = lineHeight * configuration.lineGapMultiplier

        for observation in observations {
            guard let previous = current.last else {
                current = [observation]
                continue
            }

            // Gap measured between the previous line's bottom and this line's top.
            let gap = previous.boundingBox.minY - observation.boundingBox.maxY
            let sideChanged = side(of: observation.boundingBox) != side(of: previous.boundingBox)

            if gap > maxGap || sideChanged {
                bubbles.append(current)
                current = [observation]
            } else {
                current.append(observation)
            }
        }

        if !current.isEmpty {
            bubbles.append(current)
        }

        return bubbles
    }

    /// Classifies a box by which edge it favors.
    private func side(of box: CGRect) -> ConversationSpeaker {
        let leftMargin = Double(box.minX)
        let rightMargin = 1.0 - Double(box.maxX)
        let imbalance = abs(leftMargin - rightMargin)

        if imbalance <= configuration.centeredTolerance {
            // Centered. Only short runs are chrome; a wide centered block is a real message
            // that happens to span most of the width.
            return Double(box.width) <= configuration.maxCenteredWidth ? .system : .unknown
        }

        return leftMargin < rightMargin ? .peer : .me
    }

    private func makeMessage(from bubble: [EZRecognizedTextObservation]) -> ConversationMessage {
        let box = unionBox(of: bubble)
        let speaker = side(of: box)

        // A bubble is only as trustworthy as its weakest line.
        let confidence = bubble.map(\.confidence).min() ?? 0

        let text = bubble
            .map { $0.firstText.trim() }
            .filter { !$0.isEmpty }
            .joined(separator: "\n")

        let needsReview = speaker == .unknown || confidence <= configuration.lowConfidenceThreshold

        return ConversationMessage(
            speaker: speaker,
            text: text,
            boundingBox: box,
            confidence: confidence,
            needsReview: needsReview
        )
    }

    private func unionBox(of bubble: [EZRecognizedTextObservation]) -> CGRect {
        bubble.dropFirst().reduce(bubble.first?.boundingBox ?? .zero) { partial, observation in
            partial.union(observation.boundingBox)
        }
    }

    /// Treats the capture as a WeChat conversation once both sides are present.
    ///
    /// A screenshot with bubbles on one side only could be any left-aligned document, so it
    /// stays `.unknown` rather than claiming an app it cannot verify.
    private func appHint(for messages: [ConversationMessage]) -> ConversationSnapshot.AppHint {
        let hasPeer = messages.contains { $0.speaker == .peer }
        let hasMe = messages.contains { $0.speaker == .me }
        return hasPeer && hasMe ? .wechat : .unknown
    }
}
