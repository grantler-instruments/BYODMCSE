import { useEffect } from "react";
import { useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { Canvas } from "@react-three/fiber";
import { extractBaseFrequenciesEnergy } from "../audio/utils";
import useLiveSetStore, { core } from "../store/liveSet";

const Container = styled.div`
  width: 100%;
  height: 100%;
`;
const StyledCanvas = styled(Canvas)`
  width: 100%;
  height: 100%;
`;

let baseEnergy = 0;
let midEnergy = 0;
let highEnergy = 0;

function Stage() {
  const engine = useLiveSetStore((state) => state.engine);
  const subscribeToMqtt = useLiveSetStore((state) => state.subscribeToMqtt);
  const roomId = useParams().roomId ?? "demo";

  useEffect(() => {
    subscribeToMqtt(roomId);
  }, [roomId, subscribeToMqtt]);

  useEffect(() => {
    core.on("fft", (e: { data: { real: ArrayLike<number> } }) => {
      const baseFrequencyRange: [number, number] = [20, 200];
      const midFrequencyRange: [number, number] = [201, 4000];
      const highFrequencyRange: [number, number] = [4001, 10000];
      baseEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        baseFrequencyRange
      );
      midEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        midFrequencyRange
      );
      highEnergy = extractBaseFrequenciesEnergy(
        e.data.real,
        44100,
        highFrequencyRange
      );
    });
  }, []);

  return (
    <Container>
      <StyledCanvas>
        <ambientLight intensity={0.5} />
      </StyledCanvas>
    </Container>
  );
}

export default Stage;
