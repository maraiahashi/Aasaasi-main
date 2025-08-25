// src/components/AasaasiLogo.tsx
/**
 * Aasaasi Platform Logo Component
 * Renders the brand logo with configurable variants and sizes
 */

import React from 'react';
import { AasaasiLogoProps } from '@/types/ui';

interface LogoThemeConfig {
  readonly textColor: string;
  readonly frameColor: string;
  readonly innerTextColor: string;
}

interface LogoSizeConfig {
  readonly containerClass: string;
  readonly viewBox: string;
  readonly fontSize: number;
}

class AasaasiLogo extends React.PureComponent<AasaasiLogoProps> {
  public static displayName = 'AasaasiLogo';

  private static readonly SIZE_CONFIGURATIONS: Record<string, LogoSizeConfig> = {
    sm: { containerClass: 'w-24 h-8', viewBox: '0 0 400 120', fontSize: 24 },
    md: { containerClass: 'w-32 h-12', viewBox: '0 0 400 120', fontSize: 32 },
    lg: { containerClass: 'w-48 h-16', viewBox: '0 0 400 120', fontSize: 40 },
  };

  private static readonly THEME_CONFIGURATIONS: Record<string, LogoThemeConfig> = {
    light: { textColor: '#000000', frameColor: '#000000', innerTextColor: '#FFFFFF' },
    dark:  { textColor: '#FFFFFF', frameColor: '#FFFFFF', innerTextColor: '#000000' },
  };

  private getThemeConfig(): LogoThemeConfig {
    const { variant = 'light' } = this.props;
    return AasaasiLogo.THEME_CONFIGURATIONS[variant] || AasaasiLogo.THEME_CONFIGURATIONS.light;
  }

  private getSizeConfig(): LogoSizeConfig {
    const { size = 'md' } = this.props;
    return AasaasiLogo.SIZE_CONFIGURATIONS[size] || AasaasiLogo.SIZE_CONFIGURATIONS.md;
  }

  private renderOnlineBlocks(themeConfig: LogoThemeConfig): React.ReactNode {
    const letters = ['O', 'N', 'L', 'I', 'N', 'E'];
    return (
      <g transform="translate(110, 70)">
        {letters.map((letter, index) => (
          <g key={`${letter}-${index}`}>
            <rect x={index * 25} y="0" width="20" height="20" fill={themeConfig.frameColor} />
            <text
              x={index * 25 + 10}
              y="14"
              fill={themeConfig.innerTextColor}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
            >
              {letter}
            </text>
          </g>
        ))}
      </g>
    );
  }

  public render(): React.ReactNode {
    const { className = '' } = this.props;
    const themeConfig = this.getThemeConfig();
    const sizeConfig = this.getSizeConfig();

    return (
      <div className={`${sizeConfig.containerClass} ${className}`}>
        <svg
          viewBox={sizeConfig.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          role="img"
          aria-label="Aasaasi Online Platform Logo"
        >
          <rect x="10" y="10" width="80" height="60" stroke={themeConfig.frameColor} strokeWidth="3" fill="none" />
          <text
            x="110"
            y="55"
            fill={themeConfig.textColor}
            fontSize={sizeConfig.fontSize}
            fontFamily="serif"
            fontStyle="italic"
            fontWeight="400"
          >
            Aasaasi
          </text>
          {this.renderOnlineBlocks(themeConfig)}
        </svg>
      </div>
    );
  }
}

export { AasaasiLogo };
