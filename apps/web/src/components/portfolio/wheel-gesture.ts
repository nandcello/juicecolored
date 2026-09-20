const GESTURE_IDLE_MS = 250;

// Keep wheel sampling outside React state: trackpads emit many events per frame.
export function createWheelGestureTracker() {
  let lastTime = -Infinity;
  let lastDirection = 0;
  let lastMagnitude = 0;
  let lastMomentum = false;
  let fallingSamples = 0;
  let momentumFloor: number | undefined;
  let renewedSamples = 0;

  return (event: WheelEvent, now: number) => {
    const momentum = (event as WheelEvent & { momentum?: boolean }).momentum;
    const direction = Math.sign(event.deltaY);
    const magnitude = Math.abs(event.deltaY);
    let isNewGesture = now - lastTime > GESTURE_IDLE_MS || direction !== lastDirection;

    if (typeof momentum === "boolean") {
      // The first physical event after inertia starts a new swipe, without waiting.
      isNewGesture = !momentum && (isNewGesture || lastMomentum);
    } else if (!isNewGesture && event.deltaMode === 0) {
      // Older browsers expose only deltas. Require an established decay followed
      // by two stronger samples; one noisy momentum spike must not turn a page.
      fallingSamples = magnitude < lastMagnitude ? fallingSamples + 1 : 0;
      if (fallingSamples >= 3 && momentumFloor === undefined) momentumFloor = magnitude;
      if (momentumFloor !== undefined) {
        const renewed = magnitude >= Math.max(momentumFloor * 1.5, momentumFloor + 4);
        renewedSamples = renewed ? renewedSamples + 1 : 0;
        momentumFloor = Math.min(momentumFloor, magnitude);
        isNewGesture = renewedSamples >= 2;
      }
    }

    if (isNewGesture) {
      fallingSamples = 0;
      momentumFloor = undefined;
      renewedSamples = 0;
    }
    lastTime = now;
    lastDirection = direction;
    lastMagnitude = magnitude;
    lastMomentum = momentum === true;

    return { isNewGesture, isMomentum: momentum === true };
  };
}
