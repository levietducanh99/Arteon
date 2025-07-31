import { useState } from "react";
import Image from "../../components/image/image";
import "./ProfilePage.css";
import Gallery from "../../components/Gallery/Gallery";
import { Boards } from "../../components/boards/Boards";
import { useQuery } from "@tanstack/react-query";
import apiRequest from "../../utils/apiRequest";
import { useParams } from "react-router";
import FollowButton from "./FollowButton";

const ProfilePage = () => {
  const [type, setType] = useState("saved");
  const { username } = useParams();

  const { isPending, error, data } = useQuery({
    queryKey: ["profile", username],
    queryFn: () => apiRequest.get(`/users/${username}`).then((res) => res.data),
  });

  console.log("Profile data:", data);

  if (isPending) return "Loading ...";

  if (error) return "An error has occurred: " + error.message;

  if (!data) return "User not found";

  return (
    <div className="profilePage">
      <Image
        path={data.img || "/general/noAvatar.png"}
        className="profileImg"
        w={100}
        h={100}
      ></Image>
      <h1 className="profileName">{data.displayName}</h1>
      <span className="profileUsername">@{data.username}</span>
      <div className="followCounts">
        {data.followerCount} follower ~ {data.followingCount} following
      </div>
      <div className="profileInteractions">
        <Image path="/general/share.svg" alt=""></Image>
        {data.currentUser !== data.username ? (
          <div className="profileButtons">
            <button>Message</button>
            <FollowButton
              isFollowing={data.isFollowing}
              username={data.username}
            ></FollowButton>
          </div>
        ) : (
          ""
        )}
        <Image path="/general/more.svg" alt=""></Image>
      </div>
      <div className="profileOptions">
        <span
          className={type === "created" ? "active" : ""}
          onClick={() => setType("created")}
        >
          Create
        </span>
        <span
          className={type === "saved" ? "active" : ""}
          onClick={() => setType("saved")}
        >
          Saved
        </span>
      </div>
      {type === "created" ? (
        <Gallery userId={data._id}></Gallery>
      ) : (
        <Boards userId={data._id}></Boards>
      )}
    </div>
  );
};

export default ProfilePage;
