import type { ChainlinkEstimationInput, ChainlinkEstimationResult } from '@/types';

/**
 * Calculate chainlink fence material requirements based on input parameters
 * Based on industry standard 10-foot post spacing
 */
export function calculateChainlinkMaterials(input: ChainlinkEstimationInput): ChainlinkEstimationResult {
  const { runs, fenceHeight, fenceType, ends, corners } = input;

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

  // Build result object (only include defined values)
  const result: ChainlinkEstimationResult = {
    fabricType,
    fabricFootage,
    pipeWeight,
  };

  if (interiorLinePosts > 0) result.interiorLinePosts = interiorLinePosts;
  if (topRailSticks) result.topRailSticks = topRailSticks;
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
