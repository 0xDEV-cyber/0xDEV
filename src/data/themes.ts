export type ThemePolarity = 'light' | 'dark';

export type ThemeId =
  | '0xdev-light'
  | 'warm-editorial'
  | 'nordic-frost'
  | 'botanical-sage'
  | 'lavender-atelier'
  | 'golden-sand'
  | '0xdev-dark'
  | 'cinema-obsidian'
  | 'cyber-emerald'
  | 'abyssal-cyan'
  | 'amethyst-velvet'
  | 'golden-noir'
  | 'twilight-rose'
  | 'polar-night'
  | 'volcanic-copper'
  | 'silver-studio';

export interface ThemeTokens {
  bg: string;
  surface: string;
  card: string;
  inset: string;
  elevated: string;
  border: string;
  borderStrong: string;
  primary: string;
  primaryDeep: string;
  primaryMuted: string;
  primaryFill: string;
  primaryFillHover: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  linkSoft: string;
  textHeading: string;
  textBody: string;
  textMuted: string;
  darkHero: string;
  darkHeroDeep: string;
  themeColorMeta: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  tagline: string;
  mode: ThemePolarity;
  tokens: ThemeTokens;
}

export const THEMES: ThemeDefinition[] = [
  // =========================================================================
  // 6 LIGHT THEMES
  // =========================================================================
  {
    id: '0xdev-light',
    name: '0xDEV Classic',
    tagline: 'Crisp studio white, deep navy & vivid crimson',
    mode: 'light',
    tokens: {
      bg: '#FFFFFF',
      surface: '#F6F7FB',
      card: '#FFFFFF',
      inset: '#F6F7FB',
      elevated: '#E5E7F0',
      border: '#E5E7F0',
      borderStrong: '#D3D7E6',
      primary: '#1A1464',
      primaryDeep: '#120D4A',
      primaryMuted: '#282080',
      primaryFill: '#1A1464',
      primaryFillHover: '#120D4A',
      accent: '#EE1119',
      accentHover: '#D00D14',
      accentSoft: '#EE1119',
      linkSoft: '#1A1464',
      textHeading: '#1A1464',
      textBody: '#4A4F63',
      textMuted: '#6B7188',
      darkHero: '#1A1464',
      darkHeroDeep: '#120D4A',
      themeColorMeta: '#1A1464',
    },
  },
  {
    id: 'warm-editorial',
    name: 'Warm Paper',
    tagline: 'Alabaster editorial paper, espresso ink & terracotta',
    mode: 'light',
    tokens: {
      bg: '#FFFDF9',
      surface: '#F5F0E6',
      card: '#FFFDF9',
      inset: '#F5F0E6',
      elevated: '#EBE3D5',
      border: '#E4DACB',
      borderStrong: '#D2C5B3',
      primary: '#29211B',
      primaryDeep: '#1C1510',
      primaryMuted: '#42362C',
      primaryFill: '#29211B',
      primaryFillHover: '#1C1510',
      accent: '#C2410C',
      accentHover: '#9A3412',
      accentSoft: '#C2410C',
      linkSoft: '#29211B',
      textHeading: '#29211B',
      textBody: '#544940',
      textMuted: '#786B61',
      darkHero: '#29211B',
      darkHeroDeep: '#1C1510',
      themeColorMeta: '#29211B',
    },
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    tagline: 'Glacial slate canvas with arctic cobalt accents',
    mode: 'light',
    tokens: {
      bg: '#FFFFFF',
      surface: '#F1F5F9',
      card: '#FFFFFF',
      inset: '#F1F5F9',
      elevated: '#E2E8F0',
      border: '#DCE4EE',
      borderStrong: '#CBD5E1',
      primary: '#0F172A',
      primaryDeep: '#090F1D',
      primaryMuted: '#1E293B',
      primaryFill: '#0F172A',
      primaryFillHover: '#1E293B',
      accent: '#0369A1',
      accentHover: '#075985',
      accentSoft: '#0369A1',
      linkSoft: '#0F172A',
      textHeading: '#0F172A',
      textBody: '#334155',
      textMuted: '#64748B',
      darkHero: '#0F172A',
      darkHeroDeep: '#090F1D',
      themeColorMeta: '#0F172A',
    },
  },
  {
    id: 'botanical-sage',
    name: 'Botanical Sage',
    tagline: 'Clean sage linen paired with deep forest emerald',
    mode: 'light',
    tokens: {
      bg: '#FCFDFC',
      surface: '#EFF5F1',
      card: '#FCFDFC',
      inset: '#EFF5F1',
      elevated: '#DFEBE3',
      border: '#D7E4DC',
      borderStrong: '#BDD3C5',
      primary: '#123524',
      primaryDeep: '#0B2318',
      primaryMuted: '#1D4D35',
      primaryFill: '#123524',
      primaryFillHover: '#0B2318',
      accent: '#047857',
      accentHover: '#065F46',
      accentSoft: '#047857',
      linkSoft: '#123524',
      textHeading: '#123524',
      textBody: '#355243',
      textMuted: '#587466',
      darkHero: '#123524',
      darkHeroDeep: '#0B2318',
      themeColorMeta: '#123524',
    },
  },
  {
    id: 'lavender-atelier',
    name: 'Lavender Atelier',
    tagline: 'Porcelain lilac studio with plum & royal violet',
    mode: 'light',
    tokens: {
      bg: '#FEFCFF',
      surface: '#F5F1FA',
      card: '#FEFCFF',
      inset: '#F5F1FA',
      elevated: '#E9E1F5',
      border: '#E5DCF2',
      borderStrong: '#D0C1E8',
      primary: '#2E1065',
      primaryDeep: '#1E0847',
      primaryMuted: '#4C1D95',
      primaryFill: '#2E1065',
      primaryFillHover: '#1E0847',
      accent: '#6D28D9',
      accentHover: '#5B21B6',
      accentSoft: '#6D28D9',
      linkSoft: '#2E1065',
      textHeading: '#2E1065',
      textBody: '#4B3A6E',
      textMuted: '#6E5E8F',
      darkHero: '#2E1065',
      darkHeroDeep: '#1E0847',
      themeColorMeta: '#2E1065',
    },
  },
  {
    id: 'golden-sand',
    name: 'Golden Sand',
    tagline: 'Sunlit parchment with mahogany & burnished amber',
    mode: 'light',
    tokens: {
      bg: '#FFFDF8',
      surface: '#FAF3E5',
      card: '#FFFDF8',
      inset: '#FAF3E5',
      elevated: '#F0E4CE',
      border: '#EADEC7',
      borderStrong: '#D9C7A6',
      primary: '#332110',
      primaryDeep: '#221509',
      primaryMuted: '#4D3219',
      primaryFill: '#332110',
      primaryFillHover: '#221509',
      accent: '#B45309',
      accentHover: '#92400E',
      accentSoft: '#B45309',
      linkSoft: '#332110',
      textHeading: '#332110',
      textBody: '#5E4834',
      textMuted: '#7F6853',
      darkHero: '#332110',
      darkHeroDeep: '#221509',
      themeColorMeta: '#332110',
    },
  },

  // =========================================================================
  // 10 DARK THEMES
  // =========================================================================
  {
    id: '0xdev-dark',
    name: 'Midnight Navy',
    tagline: 'Deep midnight indigo theater with signature crimson',
    mode: 'dark',
    tokens: {
      bg: '#090D1F',
      surface: '#111633',
      card: '#141A38',
      inset: '#101530',
      elevated: '#182044',
      border: '#242C54',
      borderStrong: '#3A437A',
      primary: '#2E368F',
      primaryDeep: '#120D4A',
      primaryMuted: '#232B6E',
      primaryFill: '#2E368F',
      primaryFillHover: '#3A43A8',
      accent: '#EE1119',
      accentHover: '#D00D14',
      accentSoft: '#FF8A8E',
      linkSoft: '#7C8CFF',
      textHeading: '#F4F6FC',
      textBody: '#C2C9E0',
      textMuted: '#8E97B8',
      darkHero: '#0D1229',
      darkHeroDeep: '#060917',
      themeColorMeta: '#090D1F',
    },
  },
  {
    id: 'cinema-obsidian',
    name: 'Cinema Obsidian',
    tagline: 'True OLED obsidian black & theater scarlet',
    mode: 'dark',
    tokens: {
      bg: '#09090B',
      surface: '#0F0F12',
      card: '#141418',
      inset: '#0D0D10',
      elevated: '#1C1C22',
      border: '#272730',
      borderStrong: '#3F3F4C',
      primary: '#27272A',
      primaryDeep: '#18181B',
      primaryMuted: '#3F3F46',
      primaryFill: '#27272A',
      primaryFillHover: '#3F3F46',
      accent: '#E11D48',
      accentHover: '#BE123C',
      accentSoft: '#FDA4AF',
      linkSoft: '#FB7185',
      textHeading: '#FAFAFA',
      textBody: '#D4D4D8',
      textMuted: '#9898A6',
      darkHero: '#0E0E12',
      darkHeroDeep: '#050507',
      themeColorMeta: '#09090B',
    },
  },
  {
    id: 'cyber-emerald',
    name: 'Terminal Matrix',
    tagline: 'Carbon dark workspace with electric emerald glow',
    mode: 'dark',
    tokens: {
      bg: '#060E0B',
      surface: '#0A1612',
      card: '#0D1D17',
      inset: '#08130F',
      elevated: '#122920',
      border: '#1B3B2E',
      borderStrong: '#295744',
      primary: '#065F46',
      primaryDeep: '#043D2D',
      primaryMuted: '#047857',
      primaryFill: '#065F46',
      primaryFillHover: '#047857',
      accent: '#059669',
      accentHover: '#047857',
      accentSoft: '#34D399',
      linkSoft: '#34D399',
      textHeading: '#ECFDF5',
      textBody: '#BDE6D4',
      textMuted: '#78AD96',
      darkHero: '#091510',
      darkHeroDeep: '#040A08',
      themeColorMeta: '#060E0B',
    },
  },
  {
    id: 'abyssal-cyan',
    name: 'Abyssal Ocean',
    tagline: 'Deep sea trench navy & luminous sky cyan',
    mode: 'dark',
    tokens: {
      bg: '#06111C',
      surface: '#0A1A2A',
      card: '#0D2135',
      inset: '#081624',
      elevated: '#122D48',
      border: '#1D3C5A',
      borderStrong: '#2C567D',
      primary: '#075985',
      primaryDeep: '#0C4A6E',
      primaryMuted: '#0369A1',
      primaryFill: '#075985',
      primaryFillHover: '#0369A1',
      accent: '#0284C7',
      accentHover: '#0369A1',
      accentSoft: '#38BDF8',
      linkSoft: '#38BDF8',
      textHeading: '#F0F9FF',
      textBody: '#BCD8EE',
      textMuted: '#7CA5C7',
      darkHero: '#091827',
      darkHeroDeep: '#040B13',
      themeColorMeta: '#06111C',
    },
  },
  {
    id: 'amethyst-velvet',
    name: 'Royal Amethyst',
    tagline: 'Midnight plum velvet with vibrant orchid highlights',
    mode: 'dark',
    tokens: {
      bg: '#0F091A',
      surface: '#160E26',
      card: '#1B1230',
      inset: '#130C21',
      elevated: '#261A42',
      border: '#342354',
      borderStrong: '#4D367A',
      primary: '#581C87',
      primaryDeep: '#3B0764',
      primaryMuted: '#6B21A8',
      primaryFill: '#581C87',
      primaryFillHover: '#6B21A8',
      accent: '#7E22CE',
      accentHover: '#6B21A8',
      accentSoft: '#D8B4FE',
      linkSoft: '#C084FC',
      textHeading: '#FAF5FF',
      textBody: '#DACAF2',
      textMuted: '#A18AC4',
      darkHero: '#140C24',
      darkHeroDeep: '#090510',
      themeColorMeta: '#0F091A',
    },
  },
  {
    id: 'golden-noir',
    name: 'Golden Noir',
    tagline: 'Charcoal marquee cinema with warm amber gold',
    mode: 'dark',
    tokens: {
      bg: '#110E0A',
      surface: '#18140E',
      card: '#1E1912',
      inset: '#15110C',
      elevated: '#292218',
      border: '#382E20',
      borderStrong: '#544530',
      primary: '#78350F',
      primaryDeep: '#451A03',
      primaryMuted: '#92400E',
      primaryFill: '#78350F',
      primaryFillHover: '#92400E',
      accent: '#B45309',
      accentHover: '#92400E',
      accentSoft: '#FBBF24',
      linkSoft: '#F59E0B',
      textHeading: '#FFFBEB',
      textBody: '#E6D8BC',
      textMuted: '#B09C79',
      darkHero: '#16120C',
      darkHeroDeep: '#0A0805',
      themeColorMeta: '#110E0A',
    },
  },
  {
    id: 'twilight-rose',
    name: 'Twilight Rose',
    tagline: 'Dusk slate plum illuminated by magenta coral',
    mode: 'dark',
    tokens: {
      bg: '#13101C',
      surface: '#1A1626',
      card: '#211C30',
      inset: '#171321',
      elevated: '#2C2540',
      border: '#382F4F',
      borderStrong: '#524673',
      primary: '#831843',
      primaryDeep: '#500724',
      primaryMuted: '#9D174D',
      primaryFill: '#831843',
      primaryFillHover: '#9D174D',
      accent: '#DB2777',
      accentHover: '#BE185D',
      accentSoft: '#F9A8D4',
      linkSoft: '#F472B6',
      textHeading: '#FDF2F8',
      textBody: '#E2CCE0',
      textMuted: '#A88FA9',
      darkHero: '#181424',
      darkHeroDeep: '#0B0911',
      themeColorMeta: '#13101C',
    },
  },
  {
    id: 'polar-night',
    name: 'Nord Polar',
    tagline: 'Arctic dark charcoal balanced with glacier teal',
    mode: 'dark',
    tokens: {
      bg: '#0D131A',
      surface: '#121A24',
      card: '#16202C',
      inset: '#101720',
      elevated: '#1E2C3B',
      border: '#28394A',
      borderStrong: '#3B5269',
      primary: '#115E59',
      primaryDeep: '#134E4A',
      primaryMuted: '#0F766E',
      primaryFill: '#115E59',
      primaryFillHover: '#0F766E',
      accent: '#0F766E',
      accentHover: '#115E59',
      accentSoft: '#5EEAD4',
      linkSoft: '#2DD4BF',
      textHeading: '#F0FDFA',
      textBody: '#C4D9E0',
      textMuted: '#86A4B2',
      darkHero: '#111822',
      darkHeroDeep: '#080C11',
      themeColorMeta: '#0D131A',
    },
  },
  {
    id: 'volcanic-copper',
    name: 'Volcanic Copper',
    tagline: 'Basalt night canvas with molten copper highlights',
    mode: 'dark',
    tokens: {
      bg: '#120C0B',
      surface: '#1A110F',
      card: '#211613',
      inset: '#160F0D',
      elevated: '#2E1F1B',
      border: '#3D2924',
      borderStrong: '#593C34',
      primary: '#7C2D12',
      primaryDeep: '#431407',
      primaryMuted: '#9A3412',
      primaryFill: '#7C2D12',
      primaryFillHover: '#9A3412',
      accent: '#C2410C',
      accentHover: '#9A3412',
      accentSoft: '#FDBA74',
      linkSoft: '#FB923C',
      textHeading: '#FFF7ED',
      textBody: '#E7CFC5',
      textMuted: '#B29286',
      darkHero: '#17100E',
      darkHeroDeep: '#0A0706',
      themeColorMeta: '#120C0B',
    },
  },
  {
    id: 'silver-studio',
    name: 'Monochrome Studio',
    tagline: 'Minimal neutral graphite & precision cobalt blue',
    mode: 'dark',
    tokens: {
      bg: '#0C0D10',
      surface: '#121419',
      card: '#171A21',
      inset: '#101217',
      elevated: '#21252F',
      border: '#2B303D',
      borderStrong: '#41495C',
      primary: '#1E3A8A',
      primaryDeep: '#172554',
      primaryMuted: '#1D4ED8',
      primaryFill: '#1E3A8A',
      primaryFillHover: '#1D4ED8',
      accent: '#2563EB',
      accentHover: '#1D4ED8',
      accentSoft: '#93C5FD',
      linkSoft: '#60A5FA',
      textHeading: '#F8FAFC',
      textBody: '#CBD5E1',
      textMuted: '#8D99AB',
      darkHero: '#101218',
      darkHeroDeep: '#07080B',
      themeColorMeta: '#0C0D10',
    },
  },
];

export const DEFAULT_LIGHT_THEME_ID: ThemeId = '0xdev-light';
export const DEFAULT_DARK_THEME_ID: ThemeId = '0xdev-dark';

const THEME_MAP = new Map<ThemeId, ThemeDefinition>(THEMES.map((item) => [item.id, item]));

export function normalizeStoredThemeId(raw: string | null | undefined): ThemeId | null {
  if (!raw) return null;
  if (raw === 'light') return DEFAULT_LIGHT_THEME_ID;
  if (raw === 'dark') return DEFAULT_DARK_THEME_ID;
  if (THEME_MAP.has(raw as ThemeId)) return raw as ThemeId;
  return null;
}

export function getThemeDefinition(id: ThemeId): ThemeDefinition {
  return THEME_MAP.get(id) || THEMES[0];
}
