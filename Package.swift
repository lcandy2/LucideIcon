// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "LucideIcon",
    platforms: [
        .iOS(.v14),
        .macOS(.v11),
        .watchOS(.v7),
        .tvOS(.v14),
        .visionOS(.v1)
    ],
    products: [
        .library(name: "LucideIcon", targets: ["LucideIcon"])
    ],
    targets: [
        .target(
            name: "LucideIcon",
            resources: [.process("Resources")]
        ),
        .testTarget(
            name: "LucideIconTests",
            dependencies: ["LucideIcon"]
        )
    ]
)
