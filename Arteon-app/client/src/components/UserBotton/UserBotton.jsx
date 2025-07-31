import { useState } from "react";
import "./UserBotton.css";
import Image from "../image/image";
import apiRequest from "../../utils/apiRequest";
import { Link, useNavigate } from "react-router";
import useAuthStore from "../../utils/storeAuth.js";

function UserBotton() {
  // const currentUser = true;

  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const { currentUser, removeCurrentUser } = useAuthStore();

  console.log(currentUser);

  const handleLogout = async () => {
    try {
      await apiRequest.post("/users/auth/logout", {});
      removeCurrentUser();
      navigate("/auth");
    } catch (err) {
      console.log(err);
    }
  };
  return currentUser ? (
    <div className="userBotton">
      <Image path={currentUser.img || "/general/noAvatar.png"} alt="" />
      <div onClick={() => setOpen((prev) => !prev)}>
        <Image path={"/general/arrow.svg"} alt="" className="arrow" />
      </div>
      {open && (
        <div className="userOptions">
          <Link to={`/${currentUser.username}`} className="userOption">
            Profile
          </Link>
          <div className="userOption">Setting</div>
          <div className="userOption" onClick={handleLogout}>
            Logout
          </div>
        </div>
      )}
    </div>
  ) : (
    <Link to="/auth" className="loginLink">
      Login / Sign Up
    </Link>
  );
}

export default UserBotton;
