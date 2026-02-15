/* ============================================================
   shared.js — Sourabh Tarodekar Portfolio
   ============================================================ */

(function () {
    'use strict';

    /* ----------------------------------------------------------
       1. PAGE TRANSITION
       The #page-transition overlay starts fully opaque (opacity:1).
       On DOMContentLoaded we fade it out (add .faded class).
       On any internal link click we fade it back in, wait for the
       transition, then navigate — giving a clean cross-page fade.
    ---------------------------------------------------------- */
    const overlay = document.getElementById('page-transition');

    // Fade the overlay OUT as soon as the DOM is ready
    if (overlay) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('faded'));
        });
    }

    // Intercept internal link clicks and fade out before navigating
    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[href]');
        if (!link || !overlay) return;

        const href = link.getAttribute('href');
        // Only intercept same-origin, non-hash, non-external links
        if (
            href &&
            !href.startsWith('#') &&
            !href.startsWith('mailto:') &&
            !href.startsWith('http') &&
            !link.hasAttribute('download') &&
            !link.target
        ) {
            e.preventDefault();
            overlay.classList.remove('faded'); // fade in
            setTimeout(() => { window.location.href = href; }, 220);
        }
    });

    /* ----------------------------------------------------------
       2. ENTRANCE ANIMATIONS
       Any element with class .fade-up inside .hero-animate gets
       triggered after the page overlay fades out.
    ---------------------------------------------------------- */
    function runEntranceAnimations() {
        const items = document.querySelectorAll('.fade-up');
        if (!items.length) return;
        // Small delay so the overlay fade-out completes first
        setTimeout(() => {
            items.forEach(el => el.classList.add('in'));
        }, 80);
    }

    // Run after overlay fade (200ms) + small buffer
    setTimeout(runEntranceAnimations, 220);

    /* ----------------------------------------------------------
       3. THEME TOGGLE
    ---------------------------------------------------------- */
    const themeBtn  = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    let accentColor = null; // cached for canvas

    function applyTheme(isLight) {
        document.body.classList.toggle('light-mode', isLight);
        if (themeIcon) themeIcon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
        if (typeof lucide !== 'undefined') lucide.createIcons();
        accentColor = null; // bust canvas accent cache on theme change
    }

    // Apply saved theme immediately
    applyTheme(localStorage.getItem('theme') === 'light');

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const isLight = !document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            applyTheme(isLight);
        });
    }

    /* ----------------------------------------------------------
       4. LUCIDE — render once after theme applied
    ---------------------------------------------------------- */
    if (typeof lucide !== 'undefined') lucide.createIcons();

    /* ----------------------------------------------------------
       5. MOBILE NAV TOGGLE
    ---------------------------------------------------------- */
    const menuBtn = document.getElementById('nav-menu-btn');
    const navEl   = document.querySelector('header nav');

    if (menuBtn && navEl) {
        menuBtn.addEventListener('click', () => {
            const isOpen = navEl.classList.toggle('open');
            menuBtn.setAttribute('aria-expanded', String(isOpen));
            const icon = menuBtn.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });

        navEl.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navEl.classList.remove('open');
                menuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    /* ----------------------------------------------------------
       6. SCROLL HANDLERS — progress bar, back-to-top, TOC
          Merged into one listener for performance.
    ---------------------------------------------------------- */
    const progressBar = document.getElementById('progress-bar');
    const backToTop   = document.getElementById('backToTop');
    const tocLinks    = document.querySelectorAll('.toc-link');
    const sections    = document.querySelectorAll('section[id]');

    function onScroll() {
        const scrollY      = document.documentElement.scrollTop || document.body.scrollTop;
        const totalHeight  = document.documentElement.scrollHeight - document.documentElement.clientHeight;

        // Reading progress bar
        if (progressBar && totalHeight > 0) {
            progressBar.style.width = ((scrollY / totalHeight) * 100) + '%';
        }

        // Back-to-top visibility
        if (backToTop) backToTop.classList.toggle('visible', scrollY > 500);

        // Sidebar TOC active link
        if (tocLinks.length) {
            let current = '';
            sections.forEach(s => {
                if (scrollY >= s.offsetTop - 160) current = s.getAttribute('id');
            });
            tocLinks.forEach(link => {
                const active = link.getAttribute('href').slice(1) === current;
                link.classList.toggle('active', active);
                link.setAttribute('aria-current', active ? 'location' : 'false');
            });
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    /* ----------------------------------------------------------
       7. BACK TO TOP
    ---------------------------------------------------------- */
    if (backToTop) {
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    /* ----------------------------------------------------------
       8. ACCORDION
    ---------------------------------------------------------- */
    window.toggleAccordion = function (button) {
        const item     = button.closest('.accordion-item');
        const wasActive = item.classList.contains('active');
        document.querySelectorAll('.accordion-item.active').forEach(a => {
            a.classList.remove('active');
            a.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
        });
        if (!wasActive) {
            item.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
        }
    };

    /* ----------------------------------------------------------
       9. SIDEBAR TOC — auto-build from sections
          If the page has a .toc <ul> with no children, we build
          it automatically from every section[id] on the page.
    ---------------------------------------------------------- */
    const tocList = document.querySelector('.toc');
    if (tocList && !tocList.children.length && sections.length) {
        sections.forEach(section => {
            const id    = section.getAttribute('id');
            const h2    = section.querySelector('h2');
            const label = h2 ? h2.textContent.trim() : id;
            const li    = document.createElement('li');
            li.innerHTML = `<a href="#${id}" class="toc-link">${label}</a>`;
            tocList.appendChild(li);
        });
    }

    /* ----------------------------------------------------------
       10. CIRCUIT CANVAS BACKGROUND
           - Accent color cached; busted on theme change
           - Pauses when tab hidden (Page Visibility API)
           - Debounced resize
           - Respects prefers-reduced-motion
    ---------------------------------------------------------- */
    const canvas = document.getElementById('circuit-canvas');
    if (!canvas) return;

    const ctx       = canvas.getContext('2d');
    const LINE_COUNT = parseInt(canvas.dataset.lines || '8', 10);
    const GRID_SIZE  = parseInt(canvas.dataset.grid  || '100', 10);
    const SPEED      = parseFloat(canvas.dataset.speed || '0.1');

    let width, height, circuits = [], animFrameId = null;

    function getCachedAccent() {
        if (!accentColor) {
            accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim();
        }
        return accentColor;
    }

    class CircuitLine {
        constructor() { this.reset(); }

        reset() {
            this.x = Math.round((Math.random() * window.innerWidth)  / GRID_SIZE) * GRID_SIZE;
            this.y = Math.round((Math.random() * window.innerHeight) / GRID_SIZE) * GRID_SIZE;
            this.direction    = Math.floor(Math.random() * 4);
            this.speed        = SPEED;
            this.opacity      = 0;
            this.targetOpacity = Math.random() * 0.08 + 0.02;
            this.path          = [{ x: this.x, y: this.y }];
            this.segmentLength = 0;
            this.maxSegment    = Math.random() * 3 + 2;
        }

        update() {
            if (this.opacity < this.targetOpacity) this.opacity += 0.002;

            switch (this.direction) {
                case 0: this.y -= this.speed; break;
                case 1: this.x += this.speed; break;
                case 2: this.y += this.speed; break;
                case 3: this.x -= this.speed; break;
            }

            this.segmentLength += this.speed / GRID_SIZE;

            if (this.segmentLength >= this.maxSegment) {
                if (Math.random() > 0.5) {
                    const turn = Math.random() > 0.5 ? 1 : -1;
                    this.direction = (this.direction + turn + 4) % 4;
                }
                this.segmentLength = 0;
                this.maxSegment    = Math.random() * 3 + 2;
                this.path.push({ x: this.x, y: this.y });
                if (this.path.length > 5) this.path.shift();
            }

            if (this.x < -100 || this.x > width + 100 ||
                this.y < -100 || this.y > height + 100) this.reset();
        }

        draw() {
            const color = getCachedAccent();
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = this.opacity;
            ctx.lineWidth   = 0.5;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';

            if (this.path.length > 0) {
                ctx.moveTo(this.path[0].x, this.path[0].y);
                for (const p of this.path) ctx.lineTo(p.x, p.y);
                ctx.lineTo(this.x, this.y);
            }
            ctx.stroke();

            ctx.fillStyle = color;
            this.path.forEach((p, i) => {
                if (i > 0) {
                    ctx.beginPath();
                    ctx.globalAlpha = this.opacity * 0.8;
                    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
            ctx.globalAlpha = 1;
        }
    }

    function initCircuit() {
        width  = canvas.width  = window.innerWidth;
        height = canvas.height = window.innerHeight;
        circuits = Array.from({ length: LINE_COUNT }, () => new CircuitLine());
    }

    function animateCircuit() {
        ctx.clearRect(0, 0, width, height);
        circuits.forEach(c => { c.update(); c.draw(); });
        animFrameId = requestAnimationFrame(animateCircuit);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(animFrameId);
        else animateCircuit();
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(initCircuit, 150);
    });

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        initCircuit();
        animateCircuit();
    }

})();
