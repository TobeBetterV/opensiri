//
//  ConversationReviewView.swift
//  OpenSiri
//
//  Created by openSiri on 2026/8/22.
//

import SwiftUI

// MARK: - ConversationReviewViewModel

/// Holds the snapshot being reviewed and pushes edits back to the capture service.
@MainActor
final class ConversationReviewViewModel: ObservableObject {
    // MARK: Lifecycle

    init(snapshot: ConversationSnapshot, image: NSImage) {
        self.snapshot = snapshot
        self.image = image
    }

    // MARK: Internal

    @Published var snapshot: ConversationSnapshot
    @Published var image: NSImage

    /// Message the user is currently correcting, if any.
    @Published var editingMessageID: ConversationMessage.ID?

    var messages: [ConversationMessage] {
        snapshot.messages
    }

    func update(snapshot: ConversationSnapshot, image: NSImage) {
        self.snapshot = snapshot
        self.image = image
        editingMessageID = nil
    }

    /// Binding for one message's text, so edits write straight back into the snapshot.
    func textBinding(for id: ConversationMessage.ID) -> Binding<String> {
        Binding(
            get: { [weak self] in
                self?.snapshot.messages.first { $0.id == id }?.text ?? ""
            },
            set: { [weak self] newValue in
                guard let self,
                      let index = snapshot.messages.firstIndex(where: { $0.id == id })
                else { return }
                snapshot.messages[index].text = newValue
                // The user has now vouched for this line.
                snapshot.messages[index].needsReview = false
                commit()
            }
        )
    }

    func setSpeaker(_ speaker: ConversationSpeaker, for id: ConversationMessage.ID) {
        guard let index = snapshot.messages.firstIndex(where: { $0.id == id }) else { return }
        snapshot.messages[index].speaker = speaker
        snapshot.messages[index].needsReview = false
        commit()
    }

    func copyAllText() {
        // Uses the service's rendering so the editor and downstream consumers agree on format.
        ConversationCaptureService.shared.labelledText.copyToPasteboard()
    }

    // MARK: Private

    private func commit() {
        ConversationCaptureService.shared.update(snapshot: snapshot)
    }
}

// MARK: - ConversationReviewView

/// Side-by-side review of a captured conversation: screenshot on the left, structured
/// messages on the right.
///
/// The structure comes from a geometric heuristic, so every row stays editable and anything
/// the parser was unsure about is called out rather than silently accepted.
struct ConversationReviewView: View {
    // MARK: Internal

    @ObservedObject var viewModel: ConversationReviewViewModel

    var body: some View {
        HSplitView {
            imagePane
                .frame(minWidth: 260, idealWidth: 380)

            VStack(spacing: 0) {
                header
                Divider()
                messageList
            }
            .frame(minWidth: 320)
        }
        .frame(minWidth: 640, minHeight: 420)
    }

    // MARK: Private

    private var summary: String {
        let total = viewModel.snapshot.dialogueMessages.count
        let pending = viewModel.snapshot.needsReviewCount
        let confidence = Int((viewModel.snapshot.overallConfidence * 100).rounded())
        return String(
            localized: "reply_assist.review.summary \(total) \(pending) \(confidence)"
        )
    }

    private var imagePane: some View {
        ScrollView([.horizontal, .vertical]) {
            Image(nsImage: viewModel.image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .padding(12)
        }
        .background(Color(nsColor: .textBackgroundColor))
    }

    private var header: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("reply_assist.review.title")
                    .font(.headline)
                Text(summary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                viewModel.copyAllText()
            } label: {
                Label("reply_assist.review.copy_all", systemImage: "doc.on.doc")
            }
        }
        .padding(12)
    }

    private var messageList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 8) {
                ForEach(viewModel.messages) { message in
                    MessageRow(message: message, viewModel: viewModel)
                }
            }
            .padding(12)
        }
    }
}

// MARK: - MessageRow

/// One message, aligned to the side its speaker was detected on.
private struct MessageRow: View {
    // MARK: Internal

    let message: ConversationMessage

    @ObservedObject var viewModel: ConversationReviewViewModel

    var body: some View {
        switch message.speaker {
        case .system:
            centeredChrome
        default:
            HStack {
                if message.speaker == .me { Spacer(minLength: 40) }
                bubble
                if message.speaker != .me { Spacer(minLength: 40) }
            }
        }
    }

    // MARK: Private

    private var bubbleBackground: Color {
        message.speaker == .me
            ? Color.accentColor.opacity(0.14)
            : Color(nsColor: .controlBackgroundColor)
    }

    private var speakerLabel: LocalizedStringKey {
        message.speaker == .me ? "reply_assist.speaker.me" : "reply_assist.speaker.peer"
    }

    private var speakerBinding: Binding<ConversationSpeaker> {
        Binding(
            get: { message.speaker },
            set: { viewModel.setSpeaker($0, for: message.id) }
        )
    }

    private var centeredChrome: some View {
        HStack {
            Spacer()
            Text(message.text)
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
        }
    }

    private var bubble: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text(speakerLabel)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                if message.needsReview {
                    Label("reply_assist.review.needs_review", systemImage: "exclamationmark.triangle.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                        .labelStyle(.titleAndIcon)
                }

                Spacer()

                // Reassigning the speaker is the single most likely correction, so it lives
                // inline rather than behind a context menu.
                Picker("", selection: speakerBinding) {
                    Text("reply_assist.speaker.peer").tag(ConversationSpeaker.peer)
                    Text("reply_assist.speaker.me").tag(ConversationSpeaker.me)
                    Text("reply_assist.speaker.system").tag(ConversationSpeaker.system)
                }
                .labelsHidden()
                .fixedSize()
            }

            TextEditor(text: viewModel.textBinding(for: message.id))
                .font(.body)
                .frame(minHeight: 34)
                .scrollContentBackground(.hidden)
        }
        .padding(10)
        .background(bubbleBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(message.needsReview ? Color.orange : Color.clear, lineWidth: 1)
        }
        .frame(maxWidth: 420, alignment: .leading)
    }
}
