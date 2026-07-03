export function animateScroll(
  target: HTMLElement,
  to: number,
  duration: number,
  easing: (t: number) => number = t => t
) {
  let start: number;
  let animationFrame: number;

  function step(timestamp: number) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const ease = easing(progress);
    const scrollTop = target.scrollTop + (to - target.scrollTop) * ease;
    target.scrollTop = scrollTop;
    if (progress < 1) {
      animationFrame = window.requestAnimationFrame(step);
    }
  }

  animationFrame = window.requestAnimationFrame(step);

  return () => {
    cancelAnimationFrame(animationFrame);
  };
}
