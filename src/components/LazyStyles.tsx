'use client';

import { useEffect } from 'react';

export function LazyStyles() {
    useEffect(() => {
        // Performance optimizations after initial load
        const optimizePerformance = () => {
            // Add viewport meta if not present (for mobile optimization)
            if (!document.querySelector('meta[name="viewport"]')) {
                const viewport = document.createElement('meta');
                viewport.name = 'viewport';
                viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
                document.head.appendChild(viewport);
            }

            // Add theme-color meta for better mobile experience
            if (!document.querySelector('meta[name="theme-color"]')) {
                const themeColor = document.createElement('meta');
                themeColor.name = 'theme-color';
                themeColor.content = '#ffffff';
                document.head.appendChild(themeColor);
            }

            // Optimize images loading
            const images = document.querySelectorAll('img[loading="lazy"]');
            if ('IntersectionObserver' in window) {
                const imageObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target as HTMLImageElement;
                            if (img.dataset.src) {
                                img.src = img.dataset.src;
                                img.removeAttribute('data-src');
                                imageObserver.unobserve(img);
                            }
                        }
                    });
                });

                images.forEach(img => imageObserver.observe(img));
            }
        };

        // Run optimizations after page load
        if (document.readyState === 'complete') {
            optimizePerformance();
        } else {
            window.addEventListener('load', optimizePerformance);
        }

        return () => {
            window.removeEventListener('load', optimizePerformance);
        };
    }, []);

    return null;
}
