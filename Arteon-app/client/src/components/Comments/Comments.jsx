import "./Comments.css";
import { useQuery } from "@tanstack/react-query";
import apiRequest from "../../utils/apiRequest";
import { Comment } from "./comment";
import { CommentForm } from "./CommentForm";

export const Comments = ({ id }) => {
  const { isPending, error, data } = useQuery({
    queryKey: ["comments", id],
    queryFn: () => apiRequest.get(`/comments/${id}`).then((res) => res.data),
  });

  if (isPending) return "Loading ...";

  if (error) return "An error has occurred: " + error.message;

  console.log(data);

  return (
    <div className="comments">
      <div className="commentList">
        <span className="commentCount">
          {data.length === 0 ? "No comments" : `${data.length} comments`}
        </span>
        {/* COMMENt */}
        {data.map((comment) => (
          <Comment key={comment._id} comment={comment} />
        ))}
      </div>
      <CommentForm id={id}></CommentForm>
    </div>
  );
};
