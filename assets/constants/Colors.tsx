const Colors = {
  light: {
    primary: '#f7931e',
    secondary: '#333',
    background: '#f5f5f5',
    cardBackground: '#ffffff',
    textPrimary: '#333',
    textSecondary: '#777',
    link: '#f7931e',
    border: '#f0f0f0',
    error: '#ff4d4d',
    success: '#28a745',
    warning: '#ffc107',
    greyLight: '#e0e0e0',
    greyDark: '#616161',
  },
  dark: {
    primary: '#f7931e',
    secondary: '#f5f5f5',
    background: '#333',
    cardBackground: '#444',
    textPrimary: '#f5f5f5',
    textSecondary: '#bbb',
    link: '#f7931e',
    border: '#555',
    error: '#ff4d4d',
    success: '#28a745',
    warning: '#ffc107',
    greyLight: '#666',
    greyDark: '#999',
  },
};

export type ThemeType = keyof typeof Colors;
export type ThemeColors = typeof Colors.light;

export default Colors;
