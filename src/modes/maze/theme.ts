export const defaultTheme = {
  background: "#101820",
  grid: "#658080",
  wallFill: "#2c3e4a",
  wallOutline: "#93aebc",
  exitFill: "#7ce5c2",
  exitOutline: "#7ce5c2",
  start: "#96aeb9",
};
export type CourseTheme = typeof defaultTheme;
export const colorNumber = (hex: string): number =>
  Number.parseInt(hex.slice(1), 16);
