import { useNavigate } from "react-router-dom";
import { ContentTable } from "../component/ContentTable";

function ContentList() {
  const navigate = useNavigate();

  return <ContentTable />;
}

export default ContentList;
