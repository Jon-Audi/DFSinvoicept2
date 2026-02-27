import type { ChainlinkEstimationInput, ChainlinkEstimationResult, ChainlinkFenceHeight, ChainlinkFenceType } from '@/types';

// ─── Pipe Specifications ────────────────────────────────────────────────────

const PIPE_SPECS: Record<string, { terminal: string; line: string; topRail: string }> = {
  'residential-3':  { terminal: '2"',          line: '1 5/8" SS20', topRail: "1 3/8\" x 21' (065 wall)" },
  'residential-4':  { terminal: '2"',          line: '1 5/8" SS20', topRail: "1 3/8\" x 21' (065 wall)" },
  'residential-5':  { terminal: '2"',          line: '1 5/8" SS20', topRail: "1 3/8\" x 21' (065 wall)" },
  'residential-6':  { terminal: '2"',          line: '1 5/8" SS20', topRail: "1 3/8\" x 21' (065 wall)" },
  'commercial-6':   { terminal: '2 1/2" SS40', line: '2" SS20',     topRail: "1 5/8\" x 21'" },
  'commercial-7':   { terminal: '2 1/2" SS40', line: '2" SS20',     topRail: "1 5/8\" x 21'" },
  'commercial-8':   { terminal: '3" SS40',     line: '2 1/2"',      topRail: "1 5/8\" x 21'" },
  'commercial-9':   { terminal: '3" SS40',     line: '2 1/2"',      topRail: "1 5/8\" x 21'" },
  'commercial-10':  { terminal: '3" SS40',     line: '2 1/2"',      topRail: "1 5/8\" x 21'" },
};

export function getPipeSpecs(height: ChainlinkFenceHeight, type: ChainlinkFenceType) {
  const specs = PIPE_SPECS[`${type}-${height}`];
  if (!specs) return null;
  return { ...specs, postLength: parseInt(height) + 2 };
}

// ─── Gate Cut Calculator ────────────────────────────────────────────────────

export interface GateCutInput {
  calculationMode: 'opening' | 'frame';
  gateWidthInches: number;
  gateHeightInches: number;
  frameDiameter: '1 3/8"' | '1 5/8"' | '2"';
  gateType: 'single' | 'double';
  includeHorizontalBrace: boolean;
  includeVerticalBrace: boolean;
}

export interface GateCutResult {
  leafs: number;
  leafWidthInches: number;
  frameHeightInches: number;
  postSpacingInches: number;
  requiredOpeningInches?: number;
  uprightsLengthInches: number;
  horizontalsLengthInches: number;
  horizontalBraceLengthInches?: number;
  verticalBracePieces?: { count: number; lengthInches: number };
  totalPipeFeet: number;
  needsHorizontalBrace: boolean;
  needsVerticalBrace: boolean;
  cutList: Array<{ qty: number; lengthInches: number; description: string }>;
}

export function calculateGateCuts(data: GateCutInput): GateCutResult {
  const { calculationMode, gateWidthInches, gateHeightInches, frameDiameter, gateType, includeHorizontalBrace, includeVerticalBrace } = data;

  // Deductions for post-to-post vs frame sizing
  let totalDeduction = 0;
  let numericDiameter = 0;
  let cornerFittingDeduction = 0;
  if (frameDiameter === '1 3/8"') {
    totalDeduction = 3; numericDiameter = 1.375; cornerFittingDeduction = 1.5 * 2;
  } else if (frameDiameter === '1 5/8"') {
    totalDeduction = 3.5; numericDiameter = 1.625; cornerFittingDeduction = 1.75 * 2;
  } else {
    totalDeduction = 4; numericDiameter = 2; cornerFittingDeduction = 2 * 2;
  }

  const isDouble = gateType === 'double';
  const leafs = isDouble ? 2 : 1;
  const doubleGateGap = isDouble ? 1 : 0;

  let frameWidth: number;
  let postSpacing: number;
  let requiredOpeningInches: number | undefined;

  if (calculationMode === 'opening') {
    frameWidth = gateWidthInches - totalDeduction;
    postSpacing = gateWidthInches;
  } else {
    frameWidth = gateWidthInches;
    postSpacing = gateWidthInches + totalDeduction;
    requiredOpeningInches = postSpacing;
  }

  const adjustedWidth = frameWidth - doubleGateGap;
  const leafWidth = parseFloat((adjustedWidth / leafs).toFixed(2));
  const frameHeight = gateHeightInches;

  const uprightsLength = frameHeight;
  const horizontalsLength = parseFloat((leafWidth - cornerFittingDeduction).toFixed(2));

  const needsHBrace = frameHeight > 48;
  const needsVBrace = leafWidth > 60;

  let hBraceLength: number | undefined;
  let vBracePieces: { count: number; lengthInches: number } | undefined;

  if (needsHBrace && includeHorizontalBrace) {
    hBraceLength = parseFloat((leafWidth - (numericDiameter * 2)).toFixed(2));
  }

  if (needsVBrace && includeVerticalBrace) {
    const internalHeight = frameHeight - (numericDiameter * 2);
    const bracePieceLength = parseFloat(((internalHeight - (hBraceLength !== undefined ? numericDiameter : 0)) / 2).toFixed(2));
    vBracePieces = { count: 2, lengthInches: bracePieceLength };
  }

  // Build cut list
  const cutList: GateCutResult['cutList'] = [];
  cutList.push({ qty: 2 * leafs, lengthInches: uprightsLength, description: 'Frame Uprights' });
  cutList.push({ qty: 2 * leafs, lengthInches: horizontalsLength, description: 'Frame Horizontals' });
  if (hBraceLength !== undefined) {
    cutList.push({ qty: 1 * leafs, lengthInches: hBraceLength, description: 'Horizontal Brace' });
  }
  if (vBracePieces) {
    cutList.push({ qty: vBracePieces.count * leafs, lengthInches: vBracePieces.lengthInches, description: 'Vertical Brace' });
  }

  // Total pipe in feet
  const totalPipeInches = cutList.reduce((sum, p) => sum + p.qty * p.lengthInches, 0);
  const totalPipeFeet = parseFloat((totalPipeInches / 12).toFixed(2));

  return {
    leafs,
    leafWidthInches: leafWidth,
    frameHeightInches: frameHeight,
    postSpacingInches: parseFloat(postSpacing.toFixed(2)),
    requiredOpeningInches: requiredOpeningInches !== undefined ? parseFloat(requiredOpeningInches.toFixed(2)) : undefined,
    uprightsLengthInches: uprightsLength,
    horizontalsLengthInches: horizontalsLength,
    horizontalBraceLengthInches: hBraceLength,
    verticalBracePieces: vBracePieces,
    totalPipeFeet,
    needsHorizontalBrace: needsHBrace,
    needsVerticalBrace: needsVBrace,
    cutList,
  };
}

/**
 * Calculate chainlink fence material requirements based on input parameters
 * Based on industry standard 10-foot post spacing
 */
export function calculateChainlinkMaterials(input: ChainlinkEstimationInput): ChainlinkEstimationResult {
  const {
    runs,
    fenceHeight,
    fenceType,
    fenceColor,
    ends,
    corners,
    singleGates = 0,
    doubleGates = 0,
    pedestrianGates = 0,
    includePrivacySlats = false,
    includeBarbedWire = false,
    includeBottomRail = false,
  } = input;

  // Sum all fence runs to get total linear footage
  const totalFenceLength = runs.reduce((sum, run) => sum + run.length, 0);

  // Calculate post spacing (10 feet is industry standard)
  const sections = Math.ceil(totalFenceLength / 10);
  const postSpots = sections + 1;

  // Calculate interior line posts based on configuration
  let interiorLinePosts = 0;

  if (ends === 1 && corners === 0) {
    interiorLinePosts = Math.max(0, postSpots - 1 - corners);
  } else if (ends === 0 && corners >= 0) {
    interiorLinePosts = Math.max(0, postSpots - corners);
  } else if (ends === 0 && corners === 0) {
    interiorLinePosts = Math.max(0, sections - 1);
  } else {
    // Default: 2 ends assumed
    interiorLinePosts = Math.max(0, postSpots - 2 - corners);
  }

  // Calculate fabric requirements (9ga wire is standard)
  const fabricFootage = totalFenceLength;
  const fabricType = "9ga wire";

  // Calculate top rail sticks (21-foot pieces)
  const topRailSticks = Math.ceil(totalFenceLength / 21);

  // Calculate tie wires (1.5 per linear foot)
  const tieWires = Math.ceil(totalFenceLength * 1.5);

  // Loop caps (one per interior line post)
  const loopCaps = interiorLinePosts > 0 ? interiorLinePosts : undefined;

  // Terminal post calculations
  const terminalPosts = ends + corners;

  let braceBands: number | undefined;
  let tensionBars: number | undefined;
  let tensionBands: number | undefined;
  let nutsAndBolts: number | undefined;
  let postCaps: number | undefined;

  if (terminalPosts > 0) {
    braceBands = (1 * ends) + (2 * corners);
    tensionBars = (1 * ends) + (2 * corners);
    const heightNumber = parseInt(fenceHeight);
    tensionBands = heightNumber * terminalPosts;
    nutsAndBolts = tensionBands + braceBands;
    postCaps = terminalPosts;
  }

  // Determine pipe weight based on fence type
  const pipeWeight = fenceType === 'residential' ? 'SS20 WT' : 'SS40 WT';

  // Gate calculations
  const totalGates = singleGates + doubleGates + pedestrianGates;
  // Each gate needs 2 gate posts (unless sharing with terminal posts)
  const gatePosts = totalGates * 2;
  // Each gate needs a hardware set, latch, and hinges
  const gateHardwareSets = totalGates;
  const gateLatches = totalGates;
  // Single gates need 2 hinges, double gates need 4 hinges (2 per leaf), pedestrian gates need 2 hinges
  const gateHinges = (singleGates * 2) + (doubleGates * 4) + (pedestrianGates * 2);

  // Rail ends: connects top rail to brace bands at terminal posts
  // 1 rail end per end (connects to 1 brace band), 2 rail ends per corner (connects to 2 brace bands)
  // Plus additional rail ends if bottom rail is included
  const railEndsForTopRail = terminalPosts > 0 ? (ends * 1) + (corners * 2) : 0;
  const railEndsForBottomRail = includeBottomRail && terminalPosts > 0 ? (ends * 1) + (corners * 2) : 0;
  const railEndsCount = railEndsForTopRail + railEndsForBottomRail;

  // Additional components calculations
  // Privacy slats: 1 per linear foot
  const privacySlats = includePrivacySlats ? Math.ceil(totalFenceLength) : undefined;
  // Barbed wire: sold per linear foot
  const barbedWire = includeBarbedWire ? Math.ceil(totalFenceLength) : undefined;
  // Bottom rail: same as top rail (21-foot sticks)
  const bottomRailSticks = includeBottomRail ? Math.ceil(totalFenceLength / 21) : undefined;

  // Build result object (only include defined values)
  const result: ChainlinkEstimationResult = {
    fabricType,
    fabricFootage,
    pipeWeight,
    fenceColor,
  };

  if (interiorLinePosts > 0) result.interiorLinePosts = interiorLinePosts;
  if (topRailSticks) result.topRailSticks = topRailSticks;
  if (railEndsCount > 0) result.railEnds = railEndsCount;
  if (tieWires) result.tieWires = tieWires;
  if (loopCaps) result.loopCaps = loopCaps;
  if (postCaps) result.postCaps = postCaps;
  if (braceBands) result.braceBands = braceBands;
  if (tensionBars) result.tensionBars = tensionBars;
  if (tensionBands) result.tensionBands = tensionBands;
  if (nutsAndBolts) result.nutsAndBolts = nutsAndBolts;

  // Store user-specified values for reference
  if (ends > 0) result.userSpecifiedEnds = ends;
  if (corners > 0) result.userSpecifiedCorners = corners;

  // Gate components
  if (singleGates > 0) result.singleGates = singleGates;
  if (doubleGates > 0) result.doubleGates = doubleGates;
  if (pedestrianGates > 0) result.pedestrianGates = pedestrianGates;
  if (gatePosts > 0) result.gatePosts = gatePosts;
  if (gateHardwareSets > 0) result.gateHardwareSets = gateHardwareSets;
  if (gateLatches > 0) result.gateLatches = gateLatches;
  if (gateHinges > 0) result.gateHinges = gateHinges;

  // Additional components
  if (privacySlats) result.privacySlats = privacySlats;
  if (barbedWire) result.barbedWire = barbedWire;
  if (bottomRailSticks) result.bottomRailSticks = bottomRailSticks;

  return result;
}

/**
 * Calculate the total estimated cost based on materials and pricing
 */
export function calculateChainlinkCost(
  result: ChainlinkEstimationResult,
  pricing: {
    interiorLinePostPrice: number;
    fabricPricePerFoot: number;
    topRailPricePerStick: number;
    tieWirePrice: number;
    loopCapPrice: number;
    postCapPrice: number;
    braceBandPrice: number;
    tensionBarPrice: number;
    tensionBandPrice: number;
    nutAndBoltPrice: number;
  }
): number {
  let total = 0;

  if (result.interiorLinePosts) {
    total += result.interiorLinePosts * pricing.interiorLinePostPrice;
  }

  total += result.fabricFootage * pricing.fabricPricePerFoot;

  if (result.topRailSticks) {
    total += result.topRailSticks * pricing.topRailPricePerStick;
  }

  if (result.tieWires) {
    total += result.tieWires * pricing.tieWirePrice;
  }

  if (result.loopCaps) {
    total += result.loopCaps * pricing.loopCapPrice;
  }

  if (result.postCaps) {
    total += result.postCaps * pricing.postCapPrice;
  }

  if (result.braceBands) {
    total += result.braceBands * pricing.braceBandPrice;
  }

  if (result.tensionBars) {
    total += result.tensionBars * pricing.tensionBarPrice;
  }

  if (result.tensionBands) {
    total += result.tensionBands * pricing.tensionBandPrice;
  }

  if (result.nutsAndBolts) {
    total += result.nutsAndBolts * pricing.nutAndBoltPrice;
  }

  return total;
}
