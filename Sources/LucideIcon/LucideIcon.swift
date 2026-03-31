import Foundation

/// A type-safe representation of a Lucide icon as a custom SF Symbol.
///
/// All hyphens (`-`) in icon identifiers are replaced with underscores (`_`) in Swift property names.
/// For example:
/// - `LucideIcon.arrow_down` → identifier `"arrow-down"`
/// - `LucideIcon.alarm_clock` → identifier `"alarm-clock"`
///
/// Usage:
///
/// ```swift
/// // SwiftUI
/// Image(lucide: .heart)
/// Label("Favorites", lucide: .heart)
///
/// // UIKit
/// let image = UIImage(lucide: .heart)
/// ```
public struct LucideIcon: RawRepresentable, Hashable, Sendable {
    /// The raw identifier of the Lucide symbol, matching the asset catalog name.
    public var rawValue: String

    public init(rawValue: String) {
        self.rawValue = rawValue
    }

    internal init(identifier: String) {
        self.rawValue = identifier
    }
}
