import confetti from 'canvas-confetti';

// Pixel-art style confetti with neon colors
const pixelColors = ['#ff2d7a', '#00f5ff', '#00ff88', '#ffff00', '#ff00ff', '#00ffff'];

export const useConfetti = () => {
  const firePixelConfetti = (options?: {
    particleCount?: number;
    spread?: number;
    origin?: { x: number; y: number };
  }) => {
    const defaults = {
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors: pixelColors,
      shapes: ['square'] as confetti.Shape[],
      scalar: 1.2,
      gravity: 1.2,
      drift: 0,
      ticks: 200,
    };

    confetti({
      ...defaults,
      ...options,
    });
  };

  const fireFromSides = () => {
    // Left side
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: pixelColors,
      shapes: ['square'],
      scalar: 1.2,
    });
    // Right side
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: pixelColors,
      shapes: ['square'],
      scalar: 1.2,
    });
  };

  const fireStars = () => {
    const end = Date.now() + 1000;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: pixelColors,
        shapes: ['square'],
        scalar: 0.8,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: pixelColors,
        shapes: ['square'],
        scalar: 0.8,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  const fireLevelUp = () => {
    // Big center burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.6 },
      colors: pixelColors,
      shapes: ['square'],
      scalar: 1.5,
      gravity: 0.8,
    });

    // Delayed side bursts
    setTimeout(() => {
      fireFromSides();
    }, 200);
  };

  const fireMatch = () => {
    // Heart-shaped burst for matches
    const heartShape = () => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ff2d7a', '#ff69b4', '#ff1493'],
        shapes: ['square'],
        scalar: 1.3,
      });
    };

    heartShape();
    setTimeout(heartShape, 150);
  };

  return {
    firePixelConfetti,
    fireFromSides,
    fireStars,
    fireLevelUp,
    fireMatch,
  };
};
