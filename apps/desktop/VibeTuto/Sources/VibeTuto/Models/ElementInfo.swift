import Foundation

/// Accessibility information about a UI element at the point of interaction.
struct ElementInfo: Codable, Sendable {
    let role: String
    let title: String?
    let value: String?
    let parentChain: [String]

    enum CodingKeys: String, CodingKey {
        case role
        case title
        case value
        case parentChain = "parent_chain"
    }
}
