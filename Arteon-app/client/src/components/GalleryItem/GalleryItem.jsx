import { Link } from "react-router";
import "./GalleryItem.css";
import  Image  from "../image/image";
export const GalleryItem = ({item}) => {
  const optimizedHeight = (372 * item.height) / item.width;
  return (
    <div
      className="galleryItem"
      style={{ gridRowEnd: `span ${Math.ceil(item.height / 200)}` }}
    >
      <Image path={item.media} alt="" w={372} h={optimizedHeight}></Image>
      <Link to={`/pin/${item._id}`} className="overlay"></Link>
      <button className="saveButton">Save</button>
      <div className="overlayIcons">
        <button>
          <Image path="/general/share.svg" alt="" />
        </button>
        <button>
          <Image path="/general/more.svg" alt="" />
        </button>
      </div>
    </div>
  );
};
