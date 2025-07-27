import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      text: {
        primary: string;
        secondary: string;
        light: string;
      };
      background: {
        primary: string;
        secondary: string;
        accent: string;
      };
      border: string;
      success: string;
      error: string;
      warning: string;
    };
    fonts: {
      primary: string;
      heading: string;
    };
    shadows: {
      sm: string;
      md: string;
      lg: string;
    };
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  }
}