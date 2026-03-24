// ─── UniConn Design System ───
// Inspired by Threads' minimalism with a unique editorial voice
// Font: Space Grotesk — geometric, techy, distinctly modern

export const fonts = {
    regular: 'SpaceGrotesk_400Regular',
    medium: 'SpaceGrotesk_500Medium',
    semibold: 'SpaceGrotesk_600SemiBold',
    bold: 'SpaceGrotesk_700Bold',
};

export const lightColors = {
    black: '#000000',
    white: '#FFFFFF',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    elevated: '#F5F5F5',
    gray50: '#F8F8F8',
    gray100: '#F0F0F0',
    gray200: '#E4E4E4',
    gray300: '#D4D4D4',
    gray400: '#A3A3A3',
    gray500: '#737373',
    gray600: '#525252',
    gray700: '#404040',
    gray800: '#262626',
    gray900: '#171717',
    danger: '#EF4444',
    success: '#10B981',
    blue: '#3B82F6',
    warning: '#F59E0B',
    primary: '#000000',
    text: '#000000',
    border: '#E4E4E4',
};

export const darkColors = {
    black: '#FFFFFF',
    white: '#000000',
    background: '#000000',
    surface: '#121212',
    elevated: '#1E1E1E',
    gray50: '#1A1A1A',
    gray100: '#2A2A2A',
    gray200: '#3A3A3A',
    gray300: '#4A4A4A',
    gray400: '#737373',
    gray500: '#A3A3A3',
    gray600: '#D4D4D4',
    gray700: '#E4E4E4',
    gray800: '#F0F0F0',
    gray900: '#F8F8F8',
    danger: '#F87171',
    success: '#34D399',
    blue: '#60A5FA',
    warning: '#FBBF24',
    primary: '#FFFFFF',
    text: '#FFFFFF',
    border: '#2A2A2A',
};

export const colors = lightColors; // Default fallback

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 20,
    xl: 28,
    xxl: 40,
};

export const radii = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const typography = {
    h1: { fontSize: 28, fontFamily: fonts.bold, fontWeight: '700' as const },
    h2: { fontSize: 22, fontFamily: fonts.bold, fontWeight: '700' as const },
    h3: { fontSize: 18, fontFamily: fonts.semibold, fontWeight: '600' as const },
    body: { fontSize: 15, fontFamily: fonts.regular, fontWeight: '400' as const },
    caption: { fontSize: 13, fontFamily: fonts.medium, fontWeight: '500' as const },
    small: { fontSize: 11, fontFamily: fonts.regular, fontWeight: '400' as const },
    label: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: '600' as const, letterSpacing: 0.5, textTransform: 'uppercase' as const },
};
