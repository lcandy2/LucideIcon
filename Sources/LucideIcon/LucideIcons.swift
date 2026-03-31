import SwiftUI

extension Image {
    /// Creates an image from a Lucide SF Symbol.
    ///
    /// ```swift
    /// Image(lucide: .heart)
    /// ```
    public init(lucide symbol: LucideIcon) {
        self.init(symbol.rawValue, bundle: .module)
    }
}

@available(iOS 17.0, macOS 14.0, watchOS 10.0, tvOS 17.0, visionOS 1.0, *)
extension Label where Title == Text, Icon == Image {
    /// Creates a label with a Lucide SF Symbol.
    ///
    /// ```swift
    /// Label("Favorites", lucide: .heart)
    /// ```
    public init(_ title: some StringProtocol, lucide symbol: LucideIcon) {
        self.init(title, image: .init(name: symbol.rawValue, bundle: .module))
    }
}

#if canImport(UIKit)
import UIKit

extension UIImage {
    /// Creates an image from a Lucide SF Symbol.
    ///
    /// ```swift
    /// let image = UIImage(lucide: .heart)
    /// ```
    public convenience init?(lucide symbol: LucideIcon) {
        #if os(watchOS)
        self.init(named: symbol.rawValue, in: .module, with: nil)
        #else
        self.init(named: symbol.rawValue, in: .module, compatibleWith: nil)
        #endif
    }
}
#endif

#if canImport(AppKit) && !targetEnvironment(macCatalyst)
import AppKit

extension NSImage {
    /// Creates an image from a Lucide SF Symbol.
    ///
    /// ```swift
    /// let image = NSImage(lucide: .heart)
    /// ```
    public convenience init?(lucide symbol: LucideIcon) {
        let name = NSImage.Name(symbol.rawValue)
        guard Bundle.module.image(forResource: name) != nil else { return nil }
        self.init(named: name)
    }
}
#endif
