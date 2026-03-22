import { forwardRef, ReactNode } from 'react'
import { Paper, PaperProps, Box, SxProps, Theme, useTheme as useMUITheme } from '@mui/material'

export interface IOSWidgetProps extends Omit<PaperProps, 'ref'> {
  children: ReactNode
  /**
   * Color theme for the widget gradient accent
   * Accepts any valid CSS color value
   */
  accentColor?: string
  /**
   * Whether to show the silver shine border effect
   * @default true
   */
  showShineBorder?: boolean
  /**
   * Custom padding value
   * @default 3
   */
  padding?: number
  /**
   * Whether the widget should have hover effects
   * @default true
   */
  interactive?: boolean
}

/**
 * iOS-inspired widget component with Apple-like aesthetics
 * Features:
 * - Subtle 3D depth with layered shadows
 * - Silver shine gradient border
 * - Glassmorphism backdrop blur
 * - Smooth hover transitions
 * - Dark mode support
 */
const IOSWidget = forwardRef<HTMLDivElement, IOSWidgetProps>(
  (
    {
      children,
      accentColor,
      showShineBorder = true,
      padding = 3,
      interactive = true,
      sx,
      ...props
    },
    ref
  ) => {
    const muiTheme = useMUITheme()
    const isDarkMode = muiTheme.palette.mode === 'dark'

    const baseStyles: SxProps<Theme> = {
      position: 'relative',
      p: padding,
      height: '100%',
      background: isDarkMode
        ? 'linear-gradient(180deg, rgba(30,41,59,0.98) 0%, rgba(15,23,42,0.95) 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,252,0.95) 100%)',
      borderRadius: '24px',
      border: isDarkMode
        ? '1px solid rgba(255,255,255,0.08)'
        : '1px solid rgba(255,255,255,0.8)',
      boxShadow: isDarkMode
        ? `
          0 0 0 1px rgba(255,255,255,0.03),
          0 8px 32px rgba(0,0,0,0.4),
          0 2px 8px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.05),
          inset 0 -1px 0 rgba(0,0,0,0.2)
        `
        : `
          0 0 0 1px rgba(0,0,0,0.03),
          0 8px 32px rgba(0,0,0,0.06),
          0 2px 8px rgba(0,0,0,0.04),
          inset 0 1px 0 rgba(255,255,255,1),
          inset 0 -1px 0 rgba(0,0,0,0.02)
        `,
      backdropFilter: 'blur(20px)',
      overflow: 'hidden',
      transition: 'all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1)',
      ...(interactive && {
        '&:hover': {
          transform: 'translateY(-3px) scale(1.005)',
          boxShadow: isDarkMode
            ? `
              0 0 0 1px rgba(255,255,255,0.05),
              0 20px 48px rgba(0,0,0,0.5),
              0 8px 24px rgba(0,0,0,0.4),
              inset 0 1px 0 rgba(255,255,255,0.08)
            `
            : `
              0 0 0 1px rgba(0,0,0,0.04),
              0 20px 48px rgba(0,0,0,0.10),
              0 8px 24px rgba(0,0,0,0.06),
              inset 0 1px 0 rgba(255,255,255,1)
            `,
        },
      }),
    }

    // Silver shine border pseudo-element styles
    const shineBorderStyles: SxProps<Theme> = showShineBorder
      ? {
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            padding: '1px',
            background: isDarkMode
              ? `linear-gradient(
                  180deg,
                  rgba(255, 255, 255, 0.12) 0%,
                  rgba(148, 163, 184, 0.08) 50%,
                  rgba(100, 116, 139, 0.05) 100%
                )`
              : `linear-gradient(
                  180deg,
                  rgba(255, 255, 255, 0.95) 0%,
                  rgba(220, 220, 230, 0.4) 50%,
                  rgba(200, 200, 210, 0.2) 100%
                )`,
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            zIndex: 1,
          },
        }
      : {}

    // Accent color glow effect (optional)
    const accentStyles: SxProps<Theme> = accentColor
      ? {
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${accentColor}${isDarkMode ? '60' : '40'}, transparent)`,
            borderRadius: '0 0 4px 4px',
            pointerEvents: 'none',
          },
        }
      : {}

    return (
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          ...baseStyles,
          ...shineBorderStyles,
          ...accentStyles,
          ...sx,
        }}
        {...props}
      >
        <Box sx={{ position: 'relative', zIndex: 2, height: '100%' }}>
          {children}
        </Box>
      </Paper>
    )
  }
)

IOSWidget.displayName = 'IOSWidget'

export default IOSWidget

/**
 * Pre-configured iOS widget styles for different color themes
 * Can be applied to any Paper/Box component
 */
export const iOSWidgetStyles = {
  blue: {
    accentColor: '#1e40af',
    gradient: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
  },
  cyan: {
    accentColor: '#0891b2',
    gradient: 'linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
  },
  purple: {
    accentColor: '#7c3aed',
    gradient: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
  },
  green: {
    accentColor: '#059669',
    gradient: 'linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
  },
  indigo: {
    accentColor: '#6366f1',
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
  },
}

/**
 * Get iOS widget sx props for a specific color theme
 */
export const getIOSWidgetSx = (theme: keyof typeof iOSWidgetStyles): SxProps<Theme> => ({
  background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,252,0.95) 100%), ${iOSWidgetStyles[theme].gradient}`,
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '40%',
    height: '3px',
    background: `linear-gradient(90deg, transparent, ${iOSWidgetStyles[theme].accentColor}50, transparent)`,
    borderRadius: '0 0 4px 4px',
    pointerEvents: 'none',
  },
})
