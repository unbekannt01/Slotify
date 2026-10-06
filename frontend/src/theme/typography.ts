/**
 * Slotify Mobile Design System - Typography & Spacing Tokens
 * Carefully balanced for mobile displays (360px - 430px)
 * Eliminates tiny unreadable text (<12px) while maintaining dark-mode elegance.
 */

export const typography = {
  // Brand & Displays
  displayHero: {
    fontSize: 26,
    fontWeight: '900' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  displayTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  
  // Section Headers & Card Titles
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800' as const,
    lineHeight: 18,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800' as const,
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
  },

  // Body Content
  bodyLarge: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 20,
  },

  // Interactive & Meta (NO text below 12px!)
  buttonText: {
    fontSize: 15,
    fontWeight: '800' as const,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  buttonTextSmall: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  inputText: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const layoutTokens = {
  cardRadius: 20,
  cardBorderWidth: 1.2,
  buttonHeight: 52,
  buttonRadius: 14,
  inputHeight: 52,
  inputRadius: 14,
  screenPadding: 16,
};
