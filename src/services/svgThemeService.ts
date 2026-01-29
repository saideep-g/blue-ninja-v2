/**
 * SVG THEME SERVICE
 * 
 * Dynamically transforms educational SVG strings to ensure readability 
 * across light and dark themes.
 */

export const svgThemeService = {
    /**
     * Transforms an SVG string based on the current theme.
     * targets "ink-colors" (black) and enhances "educational-accent-colors" (blue).
     */
    transform: (svgString: string, theme: 'light' | 'dark'): string => {
        if (!svgString) return '';
        if (theme === 'light') return svgString;

        // Dark Theme Transformations
        let themed = svgString;

        // 1. STROKE transformations
        // Handle attribute: stroke="black" or stroke='black' or stroke:#000
        themed = themed.replace(/stroke\s*=\s*["'](?:black|#000(?:000)?|#111(?:111)?)["']/gi, 'stroke="#ffffff"');
        // Handle style: stroke: black; or stroke: #000;
        themed = themed.replace(/stroke\s*:\s*(?:black|#000(?:000)?|#111(?:111)?)(?=[;"']|$)/gi, 'stroke: #ffffff');

        // 2. FILL transformations (skipping fill="none")
        themed = themed.replace(/fill\s*=\s*["'](?:black|#000(?:000)?|#111(?:111)?)["']/gi, 'fill="#ffffff"');
        themed = themed.replace(/fill\s*:\s*(?:black|#000(?:000)?|#111(?:111)?)(?=[;"']|$)/gi, 'fill: #ffffff');

        // 3. BLUE enhancement (Standard educational blue -> Sky Blue)
        themed = themed.replace(/stroke\s*=\s*["']blue["']/gi, 'stroke="#60a5fa"');
        themed = themed.replace(/stroke\s*:\s*blue(?=[;"']|$)/gi, 'stroke: #60a5fa');
        themed = themed.replace(/fill\s*=\s*["']blue["']/gi, 'fill="#60a5fa"');
        themed = themed.replace(/fill\s*:\s*blue(?=[;"']|$)/gi, 'fill: #60a5fa');

        // 4. TEXT handling (Ensuring default text is white)
        // Match <text tags that DON'T have a fill attribute or fill style
        themed = themed.replace(/<text([^>]*?)>/gi, (match, attrs) => {
            const hasFill = /fill\s*[=:]/i.test(attrs);
            if (!hasFill) {
                // Check if it's already flipped by step 2 (attribute case) 
                // but regex above might have missed unquoted or differently formatted ones.
                return `<text${attrs} fill="#ffffff">`;
            }
            return match;
        });

        // 5. Handle dark gray lines (which are common in coordinate planes)
        themed = themed.replace(/stroke\s*=\s*["'](?:gray|grey|darkgray|darkgrey)["']/gi, 'stroke="#94a3b8"'); // slate-400

        return themed;
    }
};
