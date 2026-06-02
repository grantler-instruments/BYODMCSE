import { createTheme } from "@mui/material/styles";
// https://coolors.co/palette/000000-14213d-fca311-e5e5e5-ffffff

const backgroundColor = "#001524";
const primary = "#2a9d8f";
const secondary = "#e9c46a";
const tertiary = "#f4a261";
const quarternary = "#e76f51";
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: secondary,
    },
    secondary: {
      main: tertiary,
    },
    background: {
      default: backgroundColor,
      paper: "#0a2233",
    },
    divider: "rgba(255, 255, 255, 0.08)",
    text: {
      primary: "rgba(255, 255, 255, 0.92)",
      secondary: "rgba(255, 255, 255, 0.65)",
    },
  },
});

export default theme;
export { backgroundColor, primary, secondary, tertiary, quarternary };
