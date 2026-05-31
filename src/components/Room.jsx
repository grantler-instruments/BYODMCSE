import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import styled from "@emotion/styled";
import NoSleep from "nosleep.js";
import Button from "@mui/material/Button";
import Stage from "./Stage";

import LoopIcon from "@mui/icons-material/Loop";
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

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function Room() {
  const roomId = useParams().roomId || "";
  const engine = useLiveSetStore((state) => state.engine);
  const initOrchestra = useLiveSetStore((state) => state.init);
  const start = useLiveSetStore((state) => state.start);
  const loading = useLiveSetStore((state) => state.loading);

  useEffect(() => {
    initOrchestra();
  }, []);

  const init = () => {
    start();
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
            position="absolute"
            bottom={"100px"}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={"14px"}></CircularProgress> : null}
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
