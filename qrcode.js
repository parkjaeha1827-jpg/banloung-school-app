/**
 * Lightweight, Standalone QR Code Generator (Nayuki algorithm)
 * Generates valid, scan-ready QR code matrices and SVGs completely offline.
 */
(function(global) {
  'use strict';

  var QrSegment = {};
  var QrCode = {};

  // Error correction levels
  var Ecc = {
    LOW: { ordinal: 0, formatBits: 1 },
    MEDIUM: { ordinal: 1, formatBits: 0 },
    QUARTILE: { ordinal: 2, formatBits: 3 },
    HIGH: { ordinal: 3, formatBits: 2 }
  };

  // Reed-Solomon generator polynomials table
  function getRSDivisor(degree) {
    var result = [1];
    var root = 1;
    for (var i = 0; i < degree; i++) {
      result.push(0);
      for (var j = result.length - 1; j >= 1; j--) {
        result[j] = multiplyGF(result[j], root) ^ result[j - 1];
      }
      result[0] = multiplyGF(result[0], root);
      root = multiplyGF(root, 0x02);
    }
    return result;
  }

  // Galois Field GF(2^8) math with primitive poly 0x11D
  var EXP_TABLE = new Array(256);
  var LOG_TABLE = new Array(256);
  (function initGF() {
    var val = 1;
    for (var i = 0; i < 255; i++) {
      EXP_TABLE[i] = val;
      LOG_TABLE[val] = i;
      val = (val << 1) ^ (val >= 128 ? 0x11D : 0);
    }
    EXP_TABLE[255] = EXP_TABLE[0];
  })();

  function multiplyGF(x, y) {
    if (x === 0 || y === 0) return 0;
    return EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255];
  }

  function getRSRemainder(data, divisor) {
    var rem = new Array(divisor.length - 1).fill(0);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem.shift();
      rem.push(0);
      for (var j = 0; j < rem.length; j++) {
        rem[j] ^= multiplyGF(divisor[divisor.length - 2 - j], factor);
      }
    }
    return rem;
  }

  // Segment: byte mode
  function makeBytesSegment(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 128) {
        bytes.push(code);
      } else if (code < 2048) {
        bytes.push(192 | (code >> 6), 128 | (code & 63));
      } else {
        bytes.push(224 | (code >> 12), 128 | ((code >> 6) & 63), 128 | (code & 63));
      }
    }
    return {
      mode: 0x4, // 8-bit byte mode
      numChars: bytes.length,
      bitData: bytes
    };
  }

  // Standard QR Code specifications (Versions 1..10)
  var NUM_ERROR_CORRECTION_BLOCKS = [
    [0, 0, 0, 0],
    [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 2, 2], [1, 2, 2, 4], [1, 2, 4, 4],
    [2, 4, 4, 4], [2, 4, 6, 5], [2, 4, 6, 6], [2, 5, 8, 8], [4, 5, 8, 8]
  ];

  var ECC_CODEWORDS_PER_BLOCK = [
    [0, 0, 0, 0],
    [7, 10, 13, 17], [10, 16, 22, 28], [15, 26, 36, 44], [20, 36, 52, 64], [26, 48, 72, 88],
    [36, 64, 96, 112], [40, 72, 108, 130], [48, 88, 132, 156], [60, 110, 160, 192], [72, 130, 192, 224]
  ];

  var RAW_CODEWORDS_TABLE = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

  // Bit Buffer helper
  function BitBuffer() {
    this.bits = [];
  }
  BitBuffer.prototype.appendBits = function(val, len) {
    for (var i = len - 1; i >= 0; i--) {
      this.bits.push((val >>> i) & 1);
    }
  };

  // Main QR Generator Class
  function SimpleQRCode(text, ecl) {
    ecl = ecl || Ecc.MEDIUM;
    var seg = makeBytesSegment(text);
    
    // Find smallest version that fits
    var version = 1;
    for (; version <= 10; version++) {
      var dataCap = (RAW_CODEWORDS_TABLE[version] - ECC_CODEWORDS_PER_BLOCK[version][ecl.ordinal] * NUM_ERROR_CORRECTION_BLOCKS[version][ecl.ordinal]) * 8;
      var headerLen = 4 + (version < 10 ? 8 : 16);
      if (headerLen + seg.numChars * 8 <= dataCap) break;
    }
    if (version > 10) version = 10;

    var size = version * 4 + 17;
    var bb = new BitBuffer();
    bb.appendBits(seg.mode, 4);
    bb.appendBits(seg.numChars, version < 10 ? 8 : 16);
    for (var i = 0; i < seg.bitData.length; i++) {
      bb.appendBits(seg.bitData[i], 8);
    }

    var totalDataBytes = RAW_CODEWORDS_TABLE[version] - ECC_CODEWORDS_PER_BLOCK[version][ecl.ordinal] * NUM_ERROR_CORRECTION_BLOCKS[version][ecl.ordinal];
    var totalDataBits = totalDataBytes * 8;
    
    // Terminator & padding
    var termLen = Math.min(4, totalDataBits - bb.bits.length);
    bb.appendBits(0, termLen);
    while (bb.bits.length % 8 !== 0) bb.appendBits(0, 1);
    var padByte = 0xEC;
    while (bb.bits.length < totalDataBits) {
      bb.appendBits(padByte, 8);
      padByte = padByte === 0xEC ? 0x11 : 0xEC;
    }

    // Convert bits to bytes
    var dataCodewords = [];
    for (var b = 0; b < bb.bits.length; b += 8) {
      var byteVal = 0;
      for (var k = 0; k < 8; k++) byteVal = (byteVal << 1) | bb.bits[b + k];
      dataCodewords.push(byteVal);
    }

    // Error correction
    var numBlocks = NUM_ERROR_CORRECTION_BLOCKS[version][ecl.ordinal];
    var blockEccLen = ECC_CODEWORDS_PER_BLOCK[version][ecl.ordinal];
    var rawBlocks = [];
    var eccBlocks = [];
    var rsDiv = getRSDivisor(blockEccLen);

    var baseLen = Math.floor(dataCodewords.length / numBlocks);
    var remainder = dataCodewords.length % numBlocks;
    var offset = 0;

    for (var bi = 0; bi < numBlocks; bi++) {
      var curLen = baseLen + (bi >= numBlocks - remainder ? 1 : 0);
      var curData = dataCodewords.slice(offset, offset + curLen);
      offset += curLen;
      rawBlocks.push(curData);
      eccBlocks.push(getRSRemainder(curData, rsDiv));
    }

    // Interleave
    var allCodewords = [];
    var maxDataLen = baseLen + (remainder > 0 ? 1 : 0);
    for (var di = 0; di < maxDataLen; di++) {
      for (var bi = 0; bi < numBlocks; bi++) {
        if (di < rawBlocks[bi].length) allCodewords.push(rawBlocks[bi][di]);
      }
    }
    for (var ei = 0; ei < blockEccLen; ei++) {
      for (var bi = 0; bi < numBlocks; bi++) {
        allCodewords.push(eccBlocks[bi][ei]);
      }
    }

    // Modules Matrix setup
    var modules = [];
    var isFunction = [];
    for (var r = 0; r < size; r++) {
      modules.push(new Array(size).fill(false));
      isFunction.push(new Array(size).fill(false));
    }

    function setFunction(x, y, val) {
      modules[y][x] = val;
      isFunction[y][x] = true;
    }

    // Finder patterns
    function drawFinder(ox, oy) {
      for (var y = -1; y <= 7; y++) {
        for (var x = -1; x <= 7; x++) {
          var px = ox + x, py = oy + y;
          if (px >= 0 && px < size && py >= 0 && py < size) {
            var isBlack = (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
                          (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
                          (x >= 2 && x <= 4 && y >= 2 && y <= 4);
            setFunction(px, py, isBlack);
          }
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);

    // Alignment patterns (for version >= 2)
    var ALIGNMENT_PATTERN_POSITIONS = [
      [], [], [6, 18], [6, 22], [6, 26], [6, 30],
      [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
    ];
    var alignPos = ALIGNMENT_PATTERN_POSITIONS[version] || [];
    for (var ai = 0; ai < alignPos.length; ai++) {
      for (var aj = 0; aj < alignPos.length; aj++) {
        var ax = alignPos[ai], ay = alignPos[aj];
        if (isFunction[ay][ax]) continue;
        for (var dy = -2; dy <= 2; dy++) {
          for (var dx = -2; dx <= 2; dx++) {
            setFunction(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
          }
        }
      }
    }

    // Timing patterns
    for (var i = 0; i < size; i++) {
      if (!isFunction[6][i]) setFunction(i, 6, i % 2 === 0);
      if (!isFunction[i][6]) setFunction(6, i, i % 2 === 0);
    }
    setFunction(8, size - 8, true); // Dark module

    // Format bits dummy reservation
    for (var i = 0; i <= 8; i++) {
      if (!isFunction[8][i]) isFunction[8][i] = true;
      if (!isFunction[i][8]) isFunction[i][8] = true;
      if (i < 8 && !isFunction[8][size - 1 - i]) isFunction[8][size - 1 - i] = true;
      if (i < 8 && !isFunction[size - 1 - i][8]) isFunction[size - 1 - i][8] = true;
    }

    // Populate data bits
    var bitIdx = 0;
    var totalBits = allCodewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right--;
      for (var vert = 0; vert < size; vert++) {
        for (var col = 0; col < 2; col++) {
          var x = right - col;
          var upwards = ((right + 1) & 2) === 0;
          var y = upwards ? size - 1 - vert : vert;
          if (!isFunction[y][x]) {
            var bit = false;
            if (bitIdx < totalBits) {
              bit = ((allCodewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1) !== 0;
              bitIdx++;
            }
            modules[y][x] = bit;
          }
        }
      }
    }

    // Mask pattern 0: (x + y) % 2 === 0
    var maskPattern = 0;
    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        if (!isFunction[y][x]) {
          var invert = ((x + y) % 2) === 0;
          if (invert) modules[y][x] = !modules[y][x];
        }
      }
    }

    // Format information (15 bits) with mask 0
    var formatData = (ecl.formatBits << 3) | maskPattern;
    var remFormat = formatData;
    for (var i = 0; i < 10; i++) remFormat = (remFormat << 1) ^ ((remFormat >>> 9) * 0x537);
    var finalFormat = ((formatData << 10) | remFormat) ^ 0x5412;

    for (var i = 0; i <= 5; i++) modules[8][i] = ((finalFormat >>> i) & 1) !== 0;
    modules[8][7] = ((finalFormat >>> 6) & 1) !== 0;
    modules[8][8] = ((finalFormat >>> 7) & 1) !== 0;
    modules[7][8] = ((finalFormat >>> 8) & 1) !== 0;
    for (var i = 9; i < 15; i++) modules[14 - i][8] = ((finalFormat >>> i) & 1) !== 0;

    for (var i = 0; i < 8; i++) modules[size - 1 - i][8] = ((finalFormat >>> i) & 1) !== 0;
    for (var i = 8; i < 15; i++) modules[8][size - 15 + i] = ((finalFormat >>> i) & 1) !== 0;

    this.size = size;
    this.modules = modules;
  }

  SimpleQRCode.prototype.toSVG = function(options) {
    options = options || {};
    var sizePx = options.size || 180;
    var margin = (options.margin !== undefined) ? options.margin : 3;
    var color = options.color || '#1e293b';
    var bg = options.background || '#ffffff';

    var matrixSize = this.size + margin * 2;
    var path = '';
    for (var y = 0; y < this.size; y++) {
      for (var x = 0; x < this.size; x++) {
        if (this.modules[y][x]) {
          path += 'M' + (x + margin) + ',' + (y + margin) + 'h1v1h-1z ';
        }
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + matrixSize + ' ' + matrixSize + '" ' +
           'width="' + sizePx + '" height="' + sizePx + '" style="border-radius: 8px; display: block; margin: 0 auto;" shape-rendering="crispEdges">' +
           '<rect width="' + matrixSize + '" height="' + matrixSize + '" fill="' + bg + '"/>' +
           '<path d="' + path + '" fill="' + color + '"/>' +
           '</svg>';
  };

  // Helper factory
  global.SimpleQRCode = SimpleQRCode;
  global.generateQRCodeSVG = function(text, size, margin) {
    try {
      var qr = new SimpleQRCode(text);
      return qr.toSVG({ size: size || 180, margin: margin || 3 });
    } catch(e) {
      console.error('generateQRCodeSVG error:', e);
      return '';
    }
  };
})(typeof window !== 'undefined' ? window : this);
