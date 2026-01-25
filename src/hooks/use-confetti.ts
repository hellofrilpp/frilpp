"use client";

export const useConfetti = () => {
  const noop = () => {};
  return {
    firePixelConfetti: noop,
    fireFromSides: noop,
    fireStars: noop,
    fireLevelUp: noop,
    fireMatch: noop,
  };
};
