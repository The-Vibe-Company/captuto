// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "VibeTuto",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "VibeTuto", targets: ["VibeTuto"])
    ],
    targets: [
        .executableTarget(
            name: "VibeTuto",
            path: "Sources/VibeTuto",
            linkerSettings: [
                .linkedFramework("ScreenCaptureKit"),
                .linkedFramework("AVFoundation"),
                .linkedFramework("CoreGraphics"),
                .linkedFramework("CoreMedia"),
                .linkedFramework("Cocoa"),
            ]
        ),
        .testTarget(
            name: "VibeTutoTests",
            dependencies: ["VibeTuto"],
            path: "Tests/VibeTutoTests"
        ),
    ]
)
