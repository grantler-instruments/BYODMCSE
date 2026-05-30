import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import styled from "@emotion/styled";
import { Link } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;
const Top = styled.div``;
const List = styled.ul``;

function Rooms() {
  return (
    <Container>
      list of rooms, will be fetched from cms later
      <List>
        <li>
          <Link to="/rooms/demo">demo</Link>
        </li>
      </List>
    </Container>
  );
}

export default Rooms;
