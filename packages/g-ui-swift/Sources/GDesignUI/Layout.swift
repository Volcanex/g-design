import SwiftUI

// MARK: Lists, forms and cards

public struct GListStyle: ViewModifier {
    public init() {}
    public func body(content: Content) -> some View {
        #if os(iOS)
        content.listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background { GTheme.background.ignoresSafeArea() }
            .foregroundStyle(GTheme.primary)
            .font(GTheme.body)
            .environment(\.defaultMinListRowHeight, 48)
        #else
        // The Mac has no inset grouped list. Inset keeps the page colour behind
        // rounded surface rows, as the web's cards sit on the page.
        content.listStyle(.inset)
            .scrollContentBackground(.hidden)
            .background(GTheme.background)
            .foregroundStyle(GTheme.primary)
            .font(GTheme.body)
            .environment(\.defaultMinListRowHeight, 40)
        #endif
    }
}

public struct GFormStyle: ViewModifier {
    public init() {}
    public func body(content: Content) -> some View {
        content.formStyle(.grouped)
            .scrollContentBackground(.hidden)
            .background(GTheme.background)
            .foregroundStyle(GTheme.primary)
            .font(GTheme.body)
    }
}

/// A card on the page: the surface fill and the token border on a rounded rectangle,
/// rounded like the inset list cards around it. The whole card is the hit target.
public struct GCardStyle: ViewModifier {
    public static let cornerRadius: CGFloat = 20
    public init() {}
    public func body(content: Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: Self.cornerRadius, style: .continuous)
        content
            .background(GTheme.surface, in: shape)
            .overlay(shape.strokeBorder(GTheme.border))
            .contentShape(shape)
    }
}

extension View {
    public func gList() -> some View { modifier(GListStyle()) }
    public func gForm() -> some View { modifier(GFormStyle()) }
    public func gRow() -> some View {
        listRowBackground(GTheme.surface).listRowSeparatorTint(GTheme.border)
    }
    public func gCard() -> some View { modifier(GCardStyle()) }
}

// MARK: Layouts

/// Subviews side by side in equal widths, as tall as the tallest.
public struct EqualColumns: Layout {
    public var spacing: CGFloat
    public init(spacing: CGFloat) { self.spacing = spacing }

    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? subviews.map { $0.sizeThatFits(.unspecified).width }.reduce(0, +)
        let column = columnWidth(width, count: subviews.count)
        let height = subviews.map { $0.sizeThatFits(ProposedViewSize(width: column, height: proposal.height)).height }.max() ?? 0
        return CGSize(width: width, height: height)
    }
    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let column = columnWidth(bounds.width, count: subviews.count)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + CGFloat(index) * (column + spacing), y: bounds.minY),
                          proposal: ProposedViewSize(width: column, height: bounds.height))
        }
    }
    private func columnWidth(_ width: CGFloat, count: Int) -> CGFloat {
        max(0, (width - spacing * CGFloat(max(0, count - 1))) / CGFloat(max(1, count)))
    }
}

/// Subviews left to right, wrapping onto a new line when the next one does not fit.
public struct FlowLayout: Layout {
    public var spacing: CGFloat
    public var lineSpacing: CGFloat
    public init(spacing: CGFloat, lineSpacing: CGFloat) {
        self.spacing = spacing
        self.lineSpacing = lineSpacing
    }

    public func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        let rows = arrange(width: width, subviews: subviews)
        let height = rows.map(\.height).reduce(0, +) + lineSpacing * CGFloat(max(0, rows.count - 1))
        let used = rows.map(\.width).max() ?? 0
        return CGSize(width: proposal.width ?? used, height: height)
    }

    public func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for row in arrange(width: bounds.width, subviews: subviews) {
            var x = bounds.minX
            for index in row.items {
                let size = subviews[index].sizeThatFits(.unspecified)
                subviews[index].place(at: CGPoint(x: x, y: y + (row.height - size.height) / 2), proposal: .unspecified)
                x += size.width + spacing
            }
            y += row.height + lineSpacing
        }
    }

    private struct Line { var items: [Int] = []; var width: CGFloat = 0; var height: CGFloat = 0 }
    private func arrange(width: CGFloat, subviews: Subviews) -> [Line] {
        var lines: [Line] = []
        var line = Line()
        for index in subviews.indices {
            let size = subviews[index].sizeThatFits(.unspecified)
            let needed = line.items.isEmpty ? size.width : line.width + spacing + size.width
            if needed > width, !line.items.isEmpty {
                lines.append(line)
                line = Line()
            }
            line.width = line.items.isEmpty ? size.width : line.width + spacing + size.width
            line.height = max(line.height, size.height)
            line.items.append(index)
        }
        if !line.items.isEmpty { lines.append(line) }
        return lines
    }
}
