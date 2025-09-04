import { createTheme, ThemeOptions } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

// Custom color palette inspired by civilization games
const civilizationColors = {
  // Primary colors - Royal blue with gold accents
  primary: {
    main: '#1e3a8a', // Deep royal blue
    light: '#3b82f6', // Lighter blue
    dark: '#1e40af', // Darker blue
    contrastText: '#ffffff'
  },

  // Secondary colors - Gold/amber for UI accents
  secondary: {
    main: '#f59e0b', // Amber/gold
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#000000'
  },

  // Success - Emerald green
  success: {
    main: '#059669',
    light: '#10b981',
    dark: '#047857',
    contrastText: '#ffffff'
  },

  // Warning - Orange
  warning: {
    main: '#ea580c',
    light: '#f97316',
    dark: '#c2410c',
    contrastText: '#ffffff'
  },

  // Error - Red
  error: {
    main: '#dc2626',
    light: '#ef4444',
    dark: '#b91c1c',
    contrastText: '#ffffff'
  },

  // Info - Cyan
  info: {
    main: '#0891b2',
    light: '#06b6d4',
    dark: '#0e7490',
    contrastText: '#ffffff'
  },

  // Background colors for dark theme
  background: {
    default: '#0f172a', // Very dark slate
    paper: '#1e293b', // Dark slate for cards/panels
    elevation1: '#334155', // Lighter slate for elevated surfaces
    elevation2: '#475569' // Even lighter for high elevation
  },

  // Text colors
  text: {
    primary: '#f1f5f9', // Very light gray
    secondary: '#cbd5e1', // Medium gray
    disabled: '#64748b' // Darker gray
  },

  // Civilization-specific colors
  civilization: {
    gold: '#fbbf24',
    science: '#3b82f6',
    culture: '#a855f7',
    faith: '#f59e0b',
    production: '#ef4444',
    food: '#22c55e',
    military: '#dc2626',
    diplomatic: '#06b6d4'
  },

  // Resource colors
  resources: {
    luxury: '#f59e0b',
    strategic: '#ef4444',
    bonus: '#22c55e'
  },

  // Terrain colors (matching the enhanced terrain rendering)
  terrain: {
    grassland: '#4ade80',
    plains: '#facc15',
    hills: '#a3a3a3',
    mountains: '#525252',
    desert: '#fbbf24',
    ocean: '#0ea5e9',
    coast: '#67e8f9',
    tundra: '#e2e8f0',
    snow: '#f8fafc',
    forest: '#16a34a',
    jungle: '#166534'
  }
};

const themeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: civilizationColors.primary,
    secondary: civilizationColors.secondary,
    success: civilizationColors.success,
    warning: civilizationColors.warning,
    error: civilizationColors.error,
    info: civilizationColors.info,
    background: civilizationColors.background,
    text: civilizationColors.text
  },

  typography: {
    fontFamily: '"Cinzel", "Times New Roman", serif', // More classical, civilization-like font
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      color: civilizationColors.text.primary,
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: civilizationColors.text.primary,
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
      color: civilizationColors.text.primary
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: civilizationColors.text.primary
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: civilizationColors.text.primary
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      color: civilizationColors.text.primary
    },
    body1: {
      fontSize: '1rem',
      color: civilizationColors.text.primary
    },
    body2: {
      fontSize: '0.875rem',
      color: civilizationColors.text.secondary
    },
    button: {
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em'
    }
  },

  components: {
    // Enhanced AppBar styling
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: civilizationColors.background.elevation2,
          backgroundImage: 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.4)',
          borderBottom: `2px solid ${civilizationColors.secondary.main}`
        }
      }
    },

    // Enhanced Paper styling
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: civilizationColors.background.paper,
          backgroundImage: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)',
          border: `1px solid ${alpha(civilizationColors.secondary.main, 0.2)}`,
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
          backdropFilter: 'blur(4px)'
        },
        elevation1: {
          backgroundColor: civilizationColors.background.elevation1
        },
        elevation2: {
          backgroundColor: civilizationColors.background.elevation2
        }
      }
    },

    // Enhanced Card styling
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: civilizationColors.background.paper,
          backgroundImage: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
          border: `2px solid ${alpha(civilizationColors.secondary.main, 0.3)}`,
          borderRadius: '12px',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px 0 rgba(0,0,0,0.5)',
            border: `2px solid ${alpha(civilizationColors.secondary.main, 0.5)}`
          }
        }
      }
    },

    // Enhanced Button styling
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.05em',
          padding: '12px 24px',
          boxShadow: '0 4px 12px 0 rgba(0,0,0,0.3)',
          transition: 'all 0.3s ease-in-out'
        },
        contained: {
          backgroundImage: `linear-gradient(45deg, ${civilizationColors.primary.main} 30%, ${civilizationColors.primary.light} 90%)`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px 0 rgba(0,0,0,0.4)',
            backgroundImage: `linear-gradient(45deg, ${civilizationColors.primary.light} 30%, ${civilizationColors.primary.main} 90%)`
          }
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px 0 rgba(0,0,0,0.3)'
          }
        }
      }
    },

    // Enhanced Chip styling
    MuiChip: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(civilizationColors.secondary.main, 0.2),
          color: civilizationColors.secondary.light,
          border: `1px solid ${alpha(civilizationColors.secondary.main, 0.4)}`,
          fontWeight: 600
        }
      }
    },

    // Enhanced Tooltip styling
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: civilizationColors.background.elevation2,
          color: civilizationColors.text.primary,
          border: `1px solid ${alpha(civilizationColors.secondary.main, 0.3)}`,
          fontSize: '0.875rem',
          borderRadius: '8px',
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.4)'
        },
        arrow: {
          color: civilizationColors.background.elevation2
        }
      }
    },

    // Enhanced Dialog styling
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: civilizationColors.background.paper,
          backgroundImage: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
          border: `2px solid ${alpha(civilizationColors.secondary.main, 0.3)}`,
          borderRadius: '16px',
          boxShadow: '0 16px 64px 0 rgba(0,0,0,0.6)'
        }
      }
    },

    // Enhanced Table styling
    MuiTableContainer: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(civilizationColors.background.paper, 0.8),
          border: `1px solid ${alpha(civilizationColors.secondary.main, 0.2)}`,
          borderRadius: '12px'
        }
      }
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(civilizationColors.primary.main, 0.2)
        }
      }
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: alpha(civilizationColors.background.elevation1, 0.3)
          },
          '&:hover': {
            backgroundColor: alpha(civilizationColors.secondary.main, 0.1)
          }
        }
      }
    },

    // Enhanced Progress components
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(civilizationColors.background.elevation1, 0.5),
          borderRadius: '8px',
          height: '8px'
        },
        bar: {
          borderRadius: '8px',
          backgroundImage: `linear-gradient(45deg, ${civilizationColors.secondary.main} 30%, ${civilizationColors.secondary.light} 90%)`
        }
      }
    },

    // Enhanced Input fields
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: alpha(civilizationColors.background.elevation1, 0.5),
            borderRadius: '8px',
            '& fieldset': {
              borderColor: alpha(civilizationColors.secondary.main, 0.3),
              borderWidth: '2px'
            },
            '&:hover fieldset': {
              borderColor: alpha(civilizationColors.secondary.main, 0.5)
            },
            '&.Mui-focused fieldset': {
              borderColor: civilizationColors.secondary.main
            }
          }
        }
      }
    }
  },

  shape: {
    borderRadius: 8
  },

  shadows: [
    'none',
    '0 2px 4px rgba(0,0,0,0.1)',
    '0 4px 8px rgba(0,0,0,0.15)',
    '0 8px 16px rgba(0,0,0,0.2)',
    '0 12px 24px rgba(0,0,0,0.25)',
    '0 16px 32px rgba(0,0,0,0.3)',
    '0 20px 40px rgba(0,0,0,0.35)',
    '0 24px 48px rgba(0,0,0,0.4)',
    '0 28px 56px rgba(0,0,0,0.45)',
    '0 32px 64px rgba(0,0,0,0.5)',
    '0 36px 72px rgba(0,0,0,0.55)',
    '0 40px 80px rgba(0,0,0,0.6)',
    '0 44px 88px rgba(0,0,0,0.65)',
    '0 48px 96px rgba(0,0,0,0.7)',
    '0 52px 104px rgba(0,0,0,0.75)',
    '0 56px 112px rgba(0,0,0,0.8)',
    '0 60px 120px rgba(0,0,0,0.85)',
    '0 64px 128px rgba(0,0,0,0.9)',
    '0 68px 136px rgba(0,0,0,0.95)',
    '0 72px 144px rgba(0,0,0,1)',
    '0 76px 152px rgba(0,0,0,1)',
    '0 80px 160px rgba(0,0,0,1)',
    '0 84px 168px rgba(0,0,0,1)',
    '0 88px 176px rgba(0,0,0,1)',
    '0 92px 184px rgba(0,0,0,1)'
  ]
};

// Create and export the civilization theme
export const civilizationTheme = createTheme(themeOptions);

// Export colors for use in components
export { civilizationColors };

// Default export
export default civilizationTheme;
