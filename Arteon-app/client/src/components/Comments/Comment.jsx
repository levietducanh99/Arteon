import Image from "../image/image";
import { format } from "timeago.js";

export const Comment = ({ comment }) => {
  // console.log(comment);
  return (
    <div className="comment">
      <Image path={comment.user.img || "./general/noAvatar.png"}></Image>
      <div className="commentContent">
        <span className="commentUsername">{comment.user.displayName}</span>
        <p className="commentText">{comment.description}</p>
        <span className="commentTime">{format(comment.createAt)}</span>
      </div>
    </div>
  );
};
