#!/usr/bin/env swift

import CoreGraphics
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

struct MatchInfo: Encodable {
  let text: String
  let confidence: Float
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct ResultInfo: Encodable {
  let answer: String
  let imageWidth: Int
  let imageHeight: Int
  let matchedCount: Int
  let matches: [MatchInfo]
  let recognizedTexts: [String]
}

struct FallbackArea: Decodable {
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

func normalized(_ value: String) -> String {
  let lowered = value.lowercased()
  let allowed = lowered.unicodeScalars.filter { scalar in
    CharacterSet.alphanumerics.contains(scalar)
      || (scalar.value >= 0xAC00 && scalar.value <= 0xD7A3)
  }
  return String(String.UnicodeScalarView(allowed))
}

func characterOverlapScore(_ lhs: String, _ rhs: String) -> Double {
  let lhsChars = Array(lhs)
  let rhsSet = Set(rhs)
  if lhsChars.isEmpty || rhsSet.isEmpty { return 0 }
  let matched = lhsChars.filter { rhsSet.contains($0) }.count
  return Double(matched) / Double(lhsChars.count)
}

func isLikelyAnswerText(answer: String, text: String) -> Bool {
  let answerNorm = normalized(answer)
  let textNorm = normalized(text)
  if answerNorm.isEmpty || textNorm.isEmpty { return false }
  if textNorm.contains(answerNorm) || answerNorm.contains(textNorm) {
    return textNorm.count >= 2 || answerNorm.count <= 2
  }
  if textNorm.count >= 2 && answerNorm.count >= 3 {
    return characterOverlapScore(answerNorm, textNorm) >= 0.72
  }
  return false
}

func expanded(_ rect: CGRect, imageWidth: CGFloat, imageHeight: CGFloat) -> CGRect {
  let padX = max(8, rect.width * 0.18)
  let padY = max(6, rect.height * 0.30)
  let next = rect.insetBy(dx: -padX, dy: -padY)
  let bounds = CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight)
  return next.intersection(bounds)
}

let args = CommandLine.arguments
guard args.count >= 4 else {
  fail("Usage: snack-food-image-ocr-blur.swift <input-image> <answer> <output-png>")
}

let inputPath = args[1]
let answer = args[2]
let outputPath = args[3]
let fallbackAreasJson = args.count >= 5 ? args[4] : "[]"
let inputUrl = URL(fileURLWithPath: inputPath)
let outputUrl = URL(fileURLWithPath: outputPath)
let fallbackAreas = (try? JSONDecoder().decode([FallbackArea].self, from: Data(fallbackAreasJson.utf8))) ?? []

guard let source = CGImageSourceCreateWithURL(inputUrl as CFURL, nil),
      let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
  fail("Failed to load image: \(inputPath)")
}

let imageWidth = CGFloat(cgImage.width)
let imageHeight = CGFloat(cgImage.height)

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["ko-KR", "en-US"]
request.minimumTextHeight = 0.012

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

let observations = (request.results ?? [])
let recognizedTexts = observations.compactMap { observation in
  observation.topCandidates(1).first?.string
}

var matches: [MatchInfo] = []
var maskImage: CIImage?

func addMask(rectTopLeft: CGRect, text: String, confidence: Float, shouldExpand: Bool = true) {
  let paddedTopLeftRect = shouldExpand
    ? expanded(rectTopLeft, imageWidth: imageWidth, imageHeight: imageHeight)
    : rectTopLeft.intersection(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))
  let ciRect = CGRect(
    x: paddedTopLeftRect.minX,
    y: imageHeight - paddedTopLeftRect.maxY,
    width: paddedTopLeftRect.width,
    height: paddedTopLeftRect.height
  )
  let rectMask = CIImage(color: .white).cropped(to: ciRect)
  if let current = maskImage {
    maskImage = rectMask.composited(over: current)
  } else {
    maskImage = rectMask
  }
  matches.append(MatchInfo(
    text: text,
    confidence: confidence,
    x: Double(paddedTopLeftRect.minX / imageWidth),
    y: Double(paddedTopLeftRect.minY / imageHeight),
    width: Double(paddedTopLeftRect.width / imageWidth),
    height: Double(paddedTopLeftRect.height / imageHeight)
  ))
}

for observation in observations {
  guard let candidate = observation.topCandidates(3).first(where: { isLikelyAnswerText(answer: answer, text: $0.string) }) else {
    continue
  }
  let box = observation.boundingBox
  let topLeftRect = CGRect(
    x: box.minX * imageWidth,
    y: (1 - box.maxY) * imageHeight,
    width: box.width * imageWidth,
    height: box.height * imageHeight
  )
  addMask(rectTopLeft: topLeftRect, text: candidate.string, confidence: candidate.confidence)
}

if matches.isEmpty {
  for area in fallbackAreas {
    let rect = CGRect(
      x: max(0, min(100, area.x)) / 100 * imageWidth,
      y: max(0, min(100, area.y)) / 100 * imageHeight,
      width: max(1, min(100, area.width)) / 100 * imageWidth,
      height: max(1, min(100, area.height)) / 100 * imageHeight
    )
    addMask(rectTopLeft: rect, text: "manual-fallback", confidence: 0, shouldExpand: false)
  }
}

let context = CIContext(options: [.workingColorSpace: NSNull()])
let original = CIImage(cgImage: cgImage)
let extent = original.extent
let outputImage: CIImage

if let mask = maskImage {
  let blurred = original
    .clampedToExtent()
    .applyingFilter("CIGaussianBlur", parameters: ["inputRadius": 20])
    .cropped(to: extent)
  let fullMask = CIImage(color: .black).cropped(to: extent)
  let compositedMask = mask.composited(over: fullMask).cropped(to: extent)
  outputImage = blurred.applyingFilter("CIBlendWithMask", parameters: [
    "inputBackgroundImage": original,
    "inputMaskImage": compositedMask
  ])
} else {
  outputImage = original
}

try context.writePNGRepresentation(
  of: outputImage,
  to: outputUrl,
  format: .RGBA8,
  colorSpace: CGColorSpaceCreateDeviceRGB()
)

let result = ResultInfo(
  answer: answer,
  imageWidth: Int(imageWidth),
  imageHeight: Int(imageHeight),
  matchedCount: matches.count,
  matches: matches,
  recognizedTexts: recognizedTexts
)
let json = try JSONEncoder().encode(result)
FileHandle.standardOutput.write(json)
FileHandle.standardOutput.write(Data("\n".utf8))
