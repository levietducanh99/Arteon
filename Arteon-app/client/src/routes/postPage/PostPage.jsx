import { Link, useParams } from "react-router";
import Image from "../../components/image/image";
import { PostInteraction } from "../../components/PostInteraction/PostInteraction";
import "./PostPage.css";
import { IconArrowBack, IconCopy, IconCheck, IconCoins } from "@tabler/icons-react";
import { Comments } from "../../components/Comments/Comments";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import apiRequest from "../../utils/apiRequest";

const PostPage = () => {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const [fractionalizingLoading, setFractionalizingLoading] = useState(false);
  const queryClient = useQueryClient();

  const { isPending, error, data } = useQuery({
    queryKey: ["pin", id],
    queryFn: () => apiRequest.get(`/pins/${id}`).then((res) => res.data),
  });

  // Mutation để fractionalize vault
  const fractionalizeMutation = useMutation({
    mutationFn: async (vaultPubkey) => {
      return apiRequest.post('/vault/fractionalize', {
        vaultPubkey: vaultPubkey,
        useServerAuthority: true
      });
    },
    onSuccess: (response) => {
      console.log('✅ Vault fractionalized successfully:', response.data);
      // Refresh pin data để update UI
      queryClient.invalidateQueries(['pin', id]);
      setFractionalizingLoading(false);
    },
    onError: (error) => {
      console.error('❌ Fractionalization failed:', error);
      alert(`Fractionalization failed: ${error.response?.data?.message || error.message}`);
      setFractionalizingLoading(false);
    }
  });

  const handleFractionalize = async () => {
    if (!data.publicKey) {
      alert('This pin does not have a vault associated with it.');
      return;
    }

    if (data.vaultStatus?.isFractionalized) {
      alert('This vault is already fractionalized.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to fractionalize this vault?\nVault Address: ${data.publicKey}`
    );

    if (confirmed) {
      setFractionalizingLoading(true);
      fractionalizeMutation.mutate(data.publicKey);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  if (isPending) return "Loading ...";
  if (error) return "An error has occurred: " + error.message;
  if (!data) return "Pin not found!!";

  const isAlreadyFractionalized = data.vaultStatus?.isFractionalized || data.isFractionalized;

  return (
    <div className="postPage">
      <IconArrowBack className="backArrow" stroke={2} />
      <div className="postContainer">
        <div className="postImg">
          <Image path={data.media} alt={data.title || "Pin image"} w={736} />
        </div>
        <div className="postDetails">
          {/* Pin Title */}
          {data.title && (
            <div className="pinTitle">
              <h1>{data.title}</h1>
            </div>
          )}

          {/* Pin Description */}
          {data.description && (
            <div className="pinDescription">
              <p>{data.description}</p>
            </div>
          )}

          {/* Fractionalize Button */}
          {data.publicKey && (
            <div className="fractionalizeSection">
              <button
                className={`fractionalizeButton ${isAlreadyFractionalized ? 'disabled' : ''}`}
                onClick={handleFractionalize}
                disabled={isAlreadyFractionalized || fractionalizingLoading}
              >
                <IconCoins size={20} />
                {fractionalizingLoading ? 'Fractionalizing...' :
                 isAlreadyFractionalized ? 'Already Fractionalized' : 'Fractionalize Vault'}
              </button>
              {!isAlreadyFractionalized && (
                <p className="fractionalizeInfo">
                  Convert this vault into tradeable tokens
                </p>
              )}
            </div>
          )}

          {/* Vault Information */}
          {data.publicKey && (
            <div className="vaultInfo">
              <h3>🏛️ Vault Information</h3>
              <div className="vaultDetails">
                <div className="vaultField">
                  <span className="fieldLabel">Vault Address:</span>
                  <div className="vaultAddress">
                    <code>{data.publicKey}</code>
                    <button
                      className="copyButton"
                      onClick={() => copyToClipboard(data.publicKey)}
                      title="Copy vault address"
                    >
                      {copied ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconCopy size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {data.vaultStatus && (
                  <>
                    <div className="vaultField">
                      <span className="fieldLabel">Fractionalized:</span>
                      <span
                        className={`status ${
                          data.vaultStatus.isFractionalized ? "yes" : "no"
                        }`}
                      >
                        {data.vaultStatus.isFractionalized
                          ? "✅ Yes"
                          : "❌ No"}
                      </span>
                    </div>

                    {data.vaultStatus.fractionalizationData && (
                      <div className="fractionalizationInfo">
                        <h4>Fractionalization Details:</h4>
                        <div className="vaultField">
                          <span className="fieldLabel">Token Mint:</span>
                          <code>
                            {
                              data.vaultStatus.fractionalizationData
                                .tokenMintAddress
                            }</code
                          >
                        </div>
                        <div className="vaultField">
                          <span className="fieldLabel">Token Balance:</span>
                          <span>
                            {
                              data.vaultStatus.fractionalizationData.tokenBalance
                            }
                          </span>
                        </div>
                        <div className="vaultField">
                          <span className="fieldLabel">Fractionalized At:</span>
                          <span>
                            {new Date(
                              data.vaultStatus.fractionalizationData.fractionalizedAt
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pin Metadata */}
          <div className="pinMetadata">
            <div className="metadataField">
              <span className="fieldLabel">Dimensions:</span>
              <span>
                {data.width} × {data.height} px
              </span>
            </div>

            {data.tags && data.tags.length > 0 && (
              <div className="metadataField">
                <span className="fieldLabel">Tags:</span>
                <div className="tagsList">
                  {data.tags.map((tag, index) => (
                    <span key={index} className="tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="metadataField">
              <span className="fieldLabel">Created:</span>
              <span>{new Date(data.createdAt).toLocaleString()}</span>
            </div>
          </div>

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
