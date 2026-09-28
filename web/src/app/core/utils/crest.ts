export function hideBrokenCrest(event: Event): void {
  const target = event.target;
  if (target instanceof HTMLImageElement) {
    target.style.display = 'none';
  }
}
