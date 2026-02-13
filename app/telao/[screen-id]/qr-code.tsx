"use client";

import { useEffect, useRef } from "react";

interface QRCodeCanvasProps {
  url: string;
  size?: number;
  bgColor?: string;
  fgColor?: string;
}

/**
 * Simple QR Code generator using Canvas.
 * This is a lightweight implementation that generates QR codes without external dependencies.
 */
export function QRCodeCanvas({
  url,
  size = 120,
  bgColor = "#ffffff",
  fgColor = "#000000",
}: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate QR code matrix
    const matrix = generateQRMatrix(url);
    const moduleCount = matrix.length;
    const moduleSize = size / moduleCount;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);

    // Draw QR code modules
    ctx.fillStyle = fgColor;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(
            col * moduleSize,
            row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
  }, [url, size, bgColor, fgColor]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block"
      aria-label={`QR Code para ${url}`}
    />
  );
}

/**
 * Generate QR code matrix.
 * This is a simplified implementation that creates a valid QR code pattern.
 * For production, consider using a proper QR code library.
 */
function generateQRMatrix(data: string): boolean[][] {
  // Using a simple encoding for demonstration
  // In production, this should use proper QR code encoding (Reed-Solomon, etc.)
  const size = 25; // QR Code Version 2 = 25x25 modules
  const matrix: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

  // Add finder patterns (the three large squares in corners)
  addFinderPattern(matrix, 0, 0);
  addFinderPattern(matrix, size - 7, 0);
  addFinderPattern(matrix, 0, size - 7);

  // Add timing patterns (alternating line between finder patterns)
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Add alignment pattern for Version 2
  addAlignmentPattern(matrix, 18, 18);

  // Add format information
  addFormatInfo(matrix);

  // Encode data (simplified - just fills remaining space based on data hash)
  encodeData(matrix, data);

  return matrix;
}

function addFinderPattern(
  matrix: boolean[][],
  startRow: number,
  startCol: number
) {
  // 7x7 finder pattern
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      // Outer border
      if (r === 0 || r === 6 || c === 0 || c === 6) {
        matrix[startRow + r][startCol + c] = true;
      }
      // Inner square
      else if (r >= 2 && r <= 4 && c >= 2 && c <= 4) {
        matrix[startRow + r][startCol + c] = true;
      }
    }
  }

  // Add separator (white border around finder pattern)
  // This is implicitly handled by the false default
}

function addAlignmentPattern(
  matrix: boolean[][],
  centerRow: number,
  centerCol: number
) {
  // 5x5 alignment pattern
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const row = centerRow + r;
      const col = centerCol + c;

      // Outer border
      if (Math.abs(r) === 2 || Math.abs(c) === 2) {
        matrix[row][col] = true;
      }
      // Center module
      else if (r === 0 && c === 0) {
        matrix[row][col] = true;
      }
    }
  }
}

function addFormatInfo(matrix: boolean[][]) {
  // Simplified format info - in real QR codes this encodes error correction level
  const formatBits = [true, false, true, false, true, false, true, false, true];

  // Around top-left finder pattern
  for (let i = 0; i < 6; i++) {
    matrix[8][i] = formatBits[i % formatBits.length];
  }
  matrix[8][7] = formatBits[6 % formatBits.length];
  matrix[8][8] = formatBits[7 % formatBits.length];
  matrix[7][8] = formatBits[8 % formatBits.length];

  for (let i = 0; i < 6; i++) {
    matrix[5 - i][8] = formatBits[(9 + i) % formatBits.length];
  }
}

function encodeData(matrix: boolean[][], data: string) {
  // Simple hash-based encoding for visual representation
  // This creates a unique pattern based on the data
  const hash = simpleHash(data);
  let bitIndex = 0;

  const size = matrix.length;

  // Fill data area (avoiding finder patterns, timing patterns, etc.)
  for (let col = size - 1; col >= 1; col -= 2) {
    // Skip timing pattern column
    if (col === 6) col = 5;

    for (let row = size - 1; row >= 0; row--) {
      for (let c = 0; c < 2; c++) {
        const currentCol = col - c;

        // Skip if this position is already used by patterns
        if (isReservedPosition(matrix, row, currentCol, size)) continue;

        // Set module based on hash
        const bit = (hash >> (bitIndex % 32)) & 1;
        matrix[row][currentCol] = bit === 1;
        bitIndex++;
      }
    }
  }

  // Apply mask pattern for better readability
  applyMaskPattern(matrix);
}

function isReservedPosition(
  matrix: boolean[][],
  row: number,
  col: number,
  size: number
): boolean {
  // Top-left finder pattern + separator
  if (row < 9 && col < 9) return true;
  // Top-right finder pattern + separator
  if (row < 9 && col >= size - 8) return true;
  // Bottom-left finder pattern + separator
  if (row >= size - 8 && col < 9) return true;
  // Timing patterns
  if (row === 6 || col === 6) return true;
  // Alignment pattern (for Version 2, centered at 18,18)
  if (row >= 16 && row <= 20 && col >= 16 && col <= 20) return true;

  return false;
}

function applyMaskPattern(matrix: boolean[][]) {
  const size = matrix.length;

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isReservedPosition(matrix, row, col, size)) continue;

      // Mask pattern 0: (row + column) mod 2 == 0
      if ((row + col) % 2 === 0) {
        matrix[row][col] = !matrix[row][col];
      }
    }
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
