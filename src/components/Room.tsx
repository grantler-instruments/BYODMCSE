import { useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "@emotion/styled";
import NoSleep from "nosleep.js";
import Button from "@mui/material/Button";
import Stage from "./Stage";
import { Box, CircularProgress } from "@mui/material";
import useLiveSetStore from "../store/liveSet";

const noSleep = new NoSleep();

const Instructions = styled.div`
  flex-grow: 1;
  display: flex;
  text-align: center;
  justify-content: center;
  align-content: center;
  flex-direction: column;
  font-size: 24px;
`;

function Room() {
  const engine = useLiveSetStore((state) => state.engine);
  const initOrchestra = useLiveSetStore((state) => state.init);
  const start = useLiveSetStore((state) => state.start);
  const loading = useLiveSetStore((state) => state.loading);

  useEffect(() => {
    void initOrchestra();
  }, [initOrchestra]);

  const init = () => {
    void start();
    noSleep.enable();
  };

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {!engine && (
        <>
          <Instructions>
            Please increase your volume to the max and enter the room
          </Instructions>
          <Box sx={{ flex: 1 }}></Box>
          <Button
            onClick={init}
            variant={"outlined"}
            size="large"
            sx={{
              marginBottom: "128px !important",
              height: "128px",
              width: "75%",
              margin: "auto",
            }}
            disabled={loading}
            startIcon={
              loading ? <CircularProgress size={"14px"}></CircularProgress> : null
            }
          >
            Enter
          </Button>
        </>
      )}
      {engine && <Stage />}
    </Box>
  );
}

export default Room;
