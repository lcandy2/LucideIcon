import Testing
@testable import LucideIcon

@Test func iconRawValue() {
    let icon = LucideIcon.heart
    #expect(icon.rawValue == "heart")
}

@Test func iconWithHyphens() {
    let icon = LucideIcon.arrow_down
    #expect(icon.rawValue == "arrow-down")
}

@Test func iconEquality() {
    let a = LucideIcon.heart
    let b = LucideIcon(rawValue: "heart")
    #expect(a == b)
}
