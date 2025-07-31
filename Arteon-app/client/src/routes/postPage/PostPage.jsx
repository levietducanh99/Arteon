import { Link, useParams } from "react-router";
import Image from "../../components/image/image";
import { PostInteraction } from "../../components/PostInteraction/PostInteraction";
import "./PostPage.css";
import { IconArrowBack } from "@tabler/icons-react";
import { Comments } from "../../components/Comments/Comments";
import { useQuery } from "@tanstack/react-query";
import apiRequest from "../../utils/apiRequest";

const PostPage = () => {
  const { id } = useParams();
  const { isPending, error, data } = useQuery({
    queryKey: ["pin", id],
    queryFn: () => apiRequest.get(`/pins/${id}`).then((res) => res.data),
  });
  if (isPending) return "Loading ...";

  if (error) return "An error has occurred: " + error.message;

  if (!data) return "Pin not found!!";

  return (
    <div className="postPage">
      <IconArrowBack className="backArrow" stroke={2} />
      <div className="postContainer">
        <div className="postImg">
          <Image path={data.media} alt="" w={736} />
        </div>
        <div className="postDetails">
          <PostInteraction postId={id}></PostInteraction>
          <Link to={`/${data.user.username}`} className="postUser">
            <Image path={data.user.img || "/general/noAvatar.png"}></Image>
            <span>{data.user.displayName}</span>
          </Link>
          <Comments id={data._id}></Comments>
        </div>
      </div>
    </div>
  );
};

export default PostPage;
