import { IKImage } from "imagekitio-react";

const Image = ({ h, w, className, alt, path, src }) => {
  return (
    <IKImage
      urlEndpoint={import.meta.env.VITE_URL_ENDPOINT}
      src={src}
      path={path}
      transformation={[{ height: h, width: w }]}
      loading="lazy"
      alt={alt}
      className={className}
      lqip={{ active: true, quality: 20 }}
    ></IKImage>
  );
};

export default Image;
