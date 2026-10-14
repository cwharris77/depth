// Renders one line of text in an installed font (by PostScript name) as a white-on-black PNG mask, cropped to the ink.
// usage: text_mask <postscript-name> <text> <out.png> [tracking-em] [x-scale]
import AppKit
let a = CommandLine.arguments
let font = NSFont(name: a[1], size: 400)!
let tracking = a.count > 4 ? Double(a[4])! : 0, xs = a.count > 5 ? Double(a[5])! : 1
let s = NSAttributedString(string: a[2], attributes: [.font: font, .foregroundColor: NSColor.white, .kern: tracking * 400])
let line = CTLineCreateWithAttributedString(s)
let b = CTLineGetImageBounds(line, nil)
let pad = 24.0, w = Int((b.width * xs + 2 * pad).rounded(.up)), h = Int((b.height + 2 * pad).rounded(.up))
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)!
ctx.setFillColor(gray: 0, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
ctx.scaleBy(x: xs, y: 1)
ctx.textPosition = CGPoint(x: pad / xs - b.minX, y: pad - b.minY)
CTLineDraw(line, ctx)
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[3]))
