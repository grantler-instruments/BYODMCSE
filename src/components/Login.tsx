import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import styled from "@emotion/styled";
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
`;
const Top = styled.div`
  flex: 1;
`;
const Bottom = styled.div`
  display: flex;
  flex-direction: column;
`;

function Login() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");
  const onEnterClicked = () => {
    navigate(`/rooms/${roomId}`, { replace: true });
  };
  return (
    <Container>
      <Top></Top>
      <Bottom>
        <TextField
          label="room id"
          variant="outlined"
          value={roomId}
          onChange={(event) => setRoomId(event.target.value)}
        />
        <Button
          variant="outlined"
          onClick={onEnterClicked}
          disabled={roomId === ""}
        >
          enter
        </Button>
      </Bottom>
    </Container>
  );
}

export default Login;
