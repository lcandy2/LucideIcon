# LucideIcon

[Lucide Icons](https://lucide.dev/) as custom SF Symbols for Swift — type-safe, multi-platform, and auto-updated.

1,694 icons converted to SF Symbols with Ultralight/Regular/Black weight variants.

## Install

Add via Swift Package Manager:

```
https://github.com/lcandy2/LucideIcon.git
```

## Usage

```swift
import LucideIcon

// SwiftUI
Image(lucide: .heart)
Image(lucide: .arrow_down)
Label("Settings", lucide: .settings)

// UIKit
let image = UIImage(lucide: .heart)

// AppKit
let image = NSImage(lucide: .heart)
```

## Platforms

- iOS 14+
- macOS 11+
- watchOS 7+
- tvOS 14+
- visionOS 1+

## How It Works

A Node.js [conversion pipeline](Scripts/convert.mjs) downloads SVGs from the [lucide-icons/lucide](https://github.com/lucide-icons/lucide) repository, computes tight bounding boxes, converts them to SF Symbol format via [swiftdraw](https://github.com/nicklockwood/SwiftDraw), and generates an Xcode asset catalog with type-safe Swift properties.

GitHub Actions runs the pipeline weekly to stay in sync with upstream Lucide releases.

## Browse Icons

See all available icons at the [gallery page](https://lcandy2.github.io/LucideIcon/).

## License

Lucide icons are licensed under [ISC License](https://github.com/lucide-icons/lucide/blob/main/LICENSE). This package's conversion tooling is MIT licensed.
