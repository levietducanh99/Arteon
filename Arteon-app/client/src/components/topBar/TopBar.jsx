import { useNavigate } from "react-router";
import Image from "../image/image";
import UserBotton from "../UserBotton/UserBotton";
import "./TopBar.css";

const TopBar = () => {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    navigate(`/search?search=${e.target[0].value}`);
  };
  return (
    <div className="topBar">
      {/* search */}
      <form onSubmit={handleSubmit} className="search">
        <Image path="/general/search.svg" alt="" />
        <input type="text" placeholder="Search" />
      </form>
      {/* user */}
      <UserBotton></UserBotton>
    </div>
  );
};

export default TopBar;
