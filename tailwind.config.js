import fs from 'node:fs';
import path from 'node:path';

const tokenPath = path.resolve(process.cwd(), 'tokens/design-tokens.json');
const designTokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

const colorTokens = designTokens.color;
const typographyTokens = designTokens.typography;
const spacingTokens = designTokens.spacing.scale;
const objectBase = designTokens.objectStyle.base;
const objectAlias = designTokens.objectStyle.alias;

const tokenSuffix = (tokenName, prefix) => tokenName.replace(new RegExp(`^--${prefix}-?`), '');

const spacingScale = Object.fromEntries(
  Object.entries(spacingTokens).map(([tokenName, value]) => [
    `spacing-${tokenSuffix(tokenName, 'spacing')}`,
    `${value.px}px`,
  ]),
);

const fontSizes = Object.fromEntries(
  Object.entries(typographyTokens.fontSize).map(([tokenName, value]) => [
    tokenSuffix(tokenName, 'fontSize'),
    [`${value.rem}rem`, { lineHeight: '1' }],
  ]),
);

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          vodafone: colorTokens.primary['--colorVodafoneRed'],
          red: colorTokens.primary['--colorRed'],
          darkRed: colorTokens.primary['--colorVodafoneDarkRed'],
          vodafoneTint: colorTokens.primary['--colorVodafoneRedTint'],
          redTint: colorTokens.primary['--colorRedTint'],
          darkRedTint: colorTokens.primary['--colorVodafoneDarkRedTint'],
        },
        secondary: {
          turquoise: colorTokens.secondary['--colorTurquoise'],
          aubergine: colorTokens.secondary['--colorAubergine'],
          freshOrange: colorTokens.secondary['--colorFreshOrange'],
          lemonYellow: colorTokens.secondary['--colorLemonYellow'],
          springGreen: colorTokens.secondary['--colorSpringGreen'],
          blue: colorTokens.secondary['--colorBlue'],
          aquaBlue: colorTokens.secondary['--colorAquaBlue'],
          turquoiseTint: colorTokens.secondary['--colorTurqouiseTint'],
          aubergineTint: colorTokens.secondary['--colorAubergineTint'],
          freshOrangeTint: colorTokens.secondary['--colorFreshOrangeTint'],
          lemonYellowTint: colorTokens.secondary['--colorLemonYellowTint'],
          springGreenTint: colorTokens.secondary['--colorSpringGreenTint'],
          blueTint: colorTokens.secondary['--colorBlueTint'],
          aquaBlueTint: colorTokens.secondary['--colorAquaBlueTint'],
        },
        neutral: {
          white: colorTokens.monochrome['--color-vodafoneWhite'],
          5: colorTokens.monochrome['--color-black05'],
          25: colorTokens.monochrome['--color-black25'],
          50: colorTokens.monochrome['--color-black50'],
          60: colorTokens.monochrome['--colorBlack60'],
          85: colorTokens.monochrome['--color-black85'],
          95: colorTokens.monochrome['--color-black95'],
        },
        semantic: {
          textNeutral: colorTokens.semantic['--colorTextNeutral'],
          borderNeutral: colorTokens.semantic['--colorBorderNeutral'],
          borderSubtle: colorTokens.semantic['--colorBorderSubtle'],
          borderFocus: colorTokens.semantic['--colorBorderFocus'],
          backgroundNeutral: colorTokens.semantic['--colorBackgroundNeutral'],
          backgroundSubtle: colorTokens.semantic['--colorBackgroundSubtle'],
          objectBrand: colorTokens.semantic['--colorObjectBrand'],
          objectSelected: colorTokens.semantic['--colorObjectSelected'],
          objectSuccess: colorTokens.semantic['--colorObjectSuccess'],
          iconSuccess: colorTokens.semantic['--colorIconSuccess'],
          iconCritical: colorTokens.semantic['--colorIconCritical'],
          borderSuccess: colorTokens.semantic['--colorBorderSuccess'],
          borderCritical: colorTokens.semantic['--colorBorderCritical'],
        },
      },
      spacing: spacingScale,
      fontFamily: {
        vodafone: [typographyTokens.fontFamily.vodafone, 'sans-serif'],
      },
      fontWeight: {
        regular: String(typographyTokens.fontWeight['--fontWeightRegular']),
        light: String(typographyTokens.fontWeight['--fontWeightLight']),
      },
      fontSize: {
        ...fontSizes,
        'heading-sm': [
          `${typographyTokens.tokens['--headingSmFontSize'] / 16}rem`,
          { lineHeight: `${typographyTokens.tokens['--headingSmLineHeight'] / 16}rem` },
        ],
        'heading-md': [
          `${typographyTokens.tokens['--headingMdFontSize'] / 16}rem`,
          { lineHeight: `${typographyTokens.tokens['--headingMdLineHeight'] / 16}rem` },
        ],
        'body-md': [
          `${typographyTokens.tokens['--bodyMdFontSize'] / 16}rem`,
          { lineHeight: `${typographyTokens.tokens['--bodyMdLineHeight'] / 16}rem` },
        ],
      },
      lineHeight: {
        'heading-sm': `${typographyTokens.tokens['--headingSmLineHeight'] / 16}rem`,
        'heading-md': `${typographyTokens.tokens['--headingMdLineHeight'] / 16}rem`,
        'body-md': `${typographyTokens.tokens['--bodyMdLineHeight'] / 16}rem`,
      },
      boxShadow: {
        tokenShadow28: objectBase['--shadow28'],
        focusOutline: objectAlias['--focusOutline'],
      },
      borderWidth: {
        0: `${objectBase['--borderWidth0']}px`,
        1: `${objectBase['--borderWidth1']}px`,
        2: `${objectBase['--borderWidth2']}px`,
        4: `${objectBase['--borderWidth4']}px`,
        none: `${objectBase['--borderWidth0']}px`,
        sm: `${objectBase['--borderWidth1']}px`,
        md: `${objectBase['--borderWidth2']}px`,
        divider: `${objectBase['--borderWidth1']}px`,
        unselected: `${objectBase['--borderWidth1']}px`,
        selected: `${objectBase['--borderWidth2']}px`,
        button: `${objectBase['--borderWidth2']}px`,
        navigation: `${objectBase['--borderWidth4']}px`,
        focus: `${objectBase['--borderWidth4']}px`,
      },
      borderRadius: {
        sm: `${objectBase['--borderRadius3']}px`,
        md: `${objectBase['--borderRadius6']}px`,
        tokenFull: `${objectBase['--borderRadius100']}px`,
      },
      opacity: {
        38: String(objectBase['--opacity38']),
        60: String(objectBase['--opacity60']),
      },
    },
  },
  plugins: [],
};
