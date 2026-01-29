import { useMemo } from 'react';
import { useTheme } from '../theme/provider';
import { svgThemeService } from '../services/svgThemeService';

/**
 * useThemedSvg Hook
 * 
 * Automatically applies theme-aware transformations to an SVG string.
 * It re-calculates whenever the theme or the input SVG changes.
 */
export function useThemedSvg(svgString: string | undefined) {
    const { effectiveTheme } = useTheme();

    const themedSvg = useMemo(() => {
        if (!svgString) return '';
        return svgThemeService.transform(svgString, effectiveTheme);
    }, [svgString, effectiveTheme]);

    return themedSvg;
}
