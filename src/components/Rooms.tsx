import styled from "@emotion/styled";
import { Link } from "react-router-dom";

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;
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
