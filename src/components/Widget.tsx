import { Box, Button, Typography } from "@mui/material";
import { backgroundColor } from "../theme";

interface Props extends React.PropsWithChildren {
  title: string;
  size?: "small" | "medium" | "large";
  focused?: boolean;
}

function Widget({ children, title, size, focused }: Props) {
  let width = 500
  if (size === "small") {
    width = 200;
  } else if (size === "large") {
    width = 700;
  }
  let bgColor = "rgb(24,24,24)"
  if(focused){
    bgColor = "rgb(100,100,100)";
  }
  return (
    <Box
      sx={{
        height: "100%",
        width: `${width}px`,
        backgroundColor: bgColor,
        borderRadius: "24px",
        padding: "12px",
        overflow: "auto",
        display: "flex",
        gap: 2,
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" color="primary">
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default Widget;
