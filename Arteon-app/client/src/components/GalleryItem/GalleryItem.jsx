import { Link } from "react-router";
import "./GalleryItem.css";
import Image from "../image/image";

export const GalleryItem = ({ item }) => {
  const optimizedHeight = (372 * item.height) / item.width;

  return (
    <div
      className="galleryItem"
      style={{ gridRowEnd: `span ${Math.ceil(item.height / 200)}` }}
    >
      <Image
        path={item.media}
        alt={item.title || "Pin image"}
        w={372}
        h={optimizedHeight}
      ></Image>
      <Link to={`/pin/${item._id}`} className="overlay"></Link>


      {/* Title and PublicKey overlay */}
      <div className="pinInfo">
        {item.title && <h3 className="pinTitle">{item.title}</h3>}
        {item.publicKey && (
          <div className="pinVault">
            <span className="vaultLabel">Vault:</span>
            <span className="vaultAddress" title={item.publicKey}>
              {item.publicKey.slice(0, 4)}...{item.publicKey.slice(-4)}
            </span>
            {item.hasVault && <span className="vaultStatus">✓</span>}
          </div>
        )}
      </div>

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
