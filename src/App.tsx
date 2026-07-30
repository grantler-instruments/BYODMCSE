import { createHashRouter, Outlet, RouterProvider } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { Box } from "@mui/material";
import { WorkInProgressBanner } from "@grantler-instruments/mui-theme";
import "./App.css";
import Home from "./components/Home";
import Room from "./components/Room";
import theme from "./theme";
import SoundCheck from "./components/SoundCheck";

const router = createHashRouter([
  {
    element: (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          display: "flex",
        }}
      >
        <Outlet />
      </Box>
    ),
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/stage/:stageId/soundcheck",
        element: <SoundCheck />,
      },
      {
        path: "/stage/:stageId/live",
        element: <Room />,
      },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WorkInProgressBanner />
      <Box
        sx={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box className="app-shell">
          <RouterProvider router={router} />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
