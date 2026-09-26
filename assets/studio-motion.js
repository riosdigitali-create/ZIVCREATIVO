/* Reveals are progressive enhancement: without JS or motion support, all content stays visible. */
(() => {
  const dock = document.querySelector('.floating-nav');
  if (dock) {
    let lastY = window.scrollY;
    let scheduled = false;
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const movingDown = currentY > lastY + 4;
        const movingUp = currentY < lastY - 4;
        const nearEnd = currentY + window.innerHeight >= document.documentElement.scrollHeight - 120;
        if (movingDown && currentY > 160 && !nearEnd) document.documentElement.classList.add('studio-dock-hidden');
        if (movingUp || currentY < 100 || nearEnd) document.documentElement.classList.remove('studio-dock-hidden');
        lastY = currentY;
        scheduled = false;
      });
    }, { passive: true });
  }
  const marquee = document.querySelector('.studio-proof-marquee');
  if (marquee && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const track = marquee.querySelector('.studio-proof-marquee-track');
    const list = track?.querySelector('.studio-proof-grid');
    if (list && !marquee.classList.contains('is-animated')) {
      const duplicate = list.cloneNode(true);
      duplicate.setAttribute('aria-hidden', 'true');
      track.append(duplicate);
      marquee.classList.add('is-animated');
    }
  }
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.step-card, .editorial-step-visual, .public-project, .project-pricing-card, .studio-proof');
  if (!targets.length) return;
  document.documentElement.classList.add('studio-motion-ready');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  targets.forEach((target) => observer.observe(target));
})();
