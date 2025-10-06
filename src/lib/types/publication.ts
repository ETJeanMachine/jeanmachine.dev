export interface RGBAColour {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-100
}

export interface RGBColour {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export type Colour = RGBAColour | RGBColour;

export interface BackgroundImage {
  image: string; // Blob reference (will be URL after transformation)
  width?: number;
  repeat?: boolean;
}

export interface PublicationTheme {
  backgroundColor?: Colour;
  backgroundImage?: BackgroundImage;
  primary?: Colour;
  pageBackground?: Colour;
  showPageBackground?: boolean;
  accentBackground?: Colour;
  accentText?: Colour;
}

export interface PublicationPreferences {
  showInDiscover?: boolean;
}

export interface Publication {
  name: string;
  base_path?: string;
  description?: string;
  icon?: string; // Blob reference (will be URL after transformation)
  theme?: PublicationTheme;
  preferences?: PublicationPreferences;
}
