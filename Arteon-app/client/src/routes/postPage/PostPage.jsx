import { Link, useParams } from "react-router";
import Image from "../../components/image/image";
import { PostInteraction } from "../../components/PostInteraction/PostInteraction";
import "./PostPage.css";
import { IconArrowBack, IconCopy, IconCheck, IconCoins, IconCurrencyDollar } from "@tabler/icons-react";
import { Comments } from "../../components/Comments/Comments";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import apiRequest from "../../utils/apiRequest";

const PostPage = () => {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const [fractionalizingLoading, setFractionalizingLoading] = useState(false);
  const [showBuyOfferModal, setShowBuyOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [buyOfferLoading, setBuyOfferLoading] = useState(false);
  const queryClient = useQueryClient();

  // Query để lấy thông tin pin
  const { isPending, error, data } = useQuery({
    queryKey: ["pin", id],
    queryFn: () => apiRequest.get(`/pins/${id}`).then((res) => res.data),
  });

  // Query để lấy thông tin fractionalization chi tiết
  // Luôn thử gọi API và xử lý error thay vì dùng enabled
  const { data: fractionalizationData, isLoading: fractionalizationLoading, error: fractionalizationError } = useQuery({
    queryKey: ["pin-fractionalization", id],
    queryFn: () => apiRequest.get(`/pins/${id}/fractionalization`).then((res) => res.data),
    enabled: !!data, // Chỉ cần data pin đã load
    retry: false,
    // Xử lý error 404 như là trạng thái bình thường (pin chưa fractionalized)
    throwOnError: false
  });

  // Mutation để fractionalize pin - sử dụng API mới
  const fractionalizeMutation = useMutation({
    mutationFn: async (pinId) => {
      return apiRequest.post(`/pins/${pinId}/fractionalize`);
    },
    onSuccess: (response) => {
      console.log('✅ Pin fractionalized successfully:', response.data);
      // Refresh cả pin data và fractionalization data
      queryClient.invalidateQueries(['pin', id]);
      queryClient.invalidateQueries(['pin-fractionalization', id]);
      setFractionalizingLoading(false);
    },
    onError: (error) => {
      console.error('❌ Fractionalization failed:', error);
      alert(`Fractionalization failed: ${error.response?.data?.message || error.message}`);
      setFractionalizingLoading(false);
    }
  });

  // Mutation để tạo buy offer
  const buyOfferMutation = useMutation({
    mutationFn: async ({ vaultAddress, offerLamports }) => {
      // Sử dụng keypair mặc định từ API backend
      console.log('🔑 Using default buyer keypair from config...');

      // Lấy keypair mặc định từ API backend
      const buyerKeypairResponse = await apiRequest.get('/buyout/generate-buyer-keypair-default');
      const buyerKeypair = buyerKeypairResponse.data.keypair;

      // Airdrop SOL to buyer if needed
      try {
        await apiRequest.post('/buyout/airdrop-buyer', {
          buyerKeypair,
          amount: 10 // Airdrop 10 SOL
        });
        console.log('💰 Airdropped SOL to default buyer wallet');
      } catch (airdropError) {
        console.warn('Airdrop failed, continuing with buyout:', airdropError);
      }

      return apiRequest.post('/buyout/initiate', {
        vaultAddress,
        offerLamports,
        buyerKeypair,
        buyerNote: `Buy offer for pin: ${data.title || 'Untitled'}`
      });
    },
    onSuccess: (response) => {
      console.log('✅ Buy offer created successfully:', response.data);
      setShowBuyOfferModal(false);
      setOfferAmount("");
      setBuyOfferLoading(false);
      alert('Buy offer created successfully!');
    },
    onError: (error) => {
      console.error('❌ Buy offer failed:', error);
      alert(`Buy offer failed: ${error.response?.data?.message || error.message}`);
      setBuyOfferLoading(false);
    }
  });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Cải thiện logic kiểm tra trạng thái fractionalized và thêm debug logging để theo dõi dữ liệu
  // Ưu tiên dữ liệu từ API fractionalization nếu có
  const hasFreactionalizationData = fractionalizationData?.success && fractionalizationData?.data;
  const isAlreadyFractionalized = hasFreactionalizationData || data?.isFractionalized || data?.vaultStatus?.isFractionalized || false;
  const fractionalizationInfo = fractionalizationData?.success ? fractionalizationData.data : null;

  // Debug logging để kiểm tra dữ liệu
  console.log('🔍 Debug info:', {
    pinId: id,
    dataIsFractionalized: data?.isFractionalized,
    vaultStatusFractionalized: data?.vaultStatus?.isFractionalized,
    hasFreactionalizationData,
    fractionalizationLoading,
    fractionalizationError: fractionalizationError?.response?.status,
    isAlreadyFractionalized
  });

  const handleFractionalize = async () => {
    if (!data.publicKey) {
      alert('This pin does not have a vault associated with it.');
      return;
    }

    if (data.vaultStatus?.isFractionalized || data.isFractionalized) {
      alert('This pin is already fractionalized.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to fractionalize this pin?\nVault Address: ${data.publicKey}\n\nThis will convert the vault into tradeable tokens.`
    );

    if (confirmed) {
      setFractionalizingLoading(true);
      fractionalizeMutation.mutate(id);
    }
  };

  const handleBuyOffer = () => {
    if (!data.publicKey) {
      alert('This pin does not have a vault associated with it.');
      return;
    }

    if (!isAlreadyFractionalized) {
      alert('Pin must be fractionalized before creating buy offers.');
      return;
    }

    setShowBuyOfferModal(true);
  };

  const handleSubmitBuyOffer = () => {
    if (!offerAmount || isNaN(offerAmount) || parseFloat(offerAmount) <= 0) {
      alert('Please enter a valid offer amount in SOL.');
      return;
    }

    const offerLamports = Math.floor(parseFloat(offerAmount) * 1000000000); // Convert SOL to lamports

    const confirmed = window.confirm(
      `Create buy offer for ${offerAmount} SOL?\n\nVault: ${data.publicKey}\nPin: ${data.title || 'Untitled'}`
    );

    if (confirmed) {
      setBuyOfferLoading(true);
      buyOfferMutation.mutate({
        vaultAddress: data.publicKey,
        offerLamports
      });
    }
  };

  if (isPending) return "Loading ...";

  if (error) return "An error has occurred: " + error.message;

  if (!data) return "Pin not found!!";

  return (
    <div className="postPage">
      {/* Buy Offer Modal */}
      {showBuyOfferModal && (
        <div className="modal-overlay" onClick={() => setShowBuyOfferModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Buy Offer</h3>
            <p>Pin: <strong>{data.title || 'Untitled'}</strong></p>
            <p>Vault: <code>{data.publicKey}</code></p>

            <div className="offer-input-group">
              <label htmlFor="offerAmount">Offer Amount (SOL):</label>
              <input
                type="number"
                id="offerAmount"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="e.g. 1.5"
                step="0.1"
                min="0.1"
                disabled={buyOfferLoading}
              />
              <small>Minimum: 0.1 SOL</small>
            </div>

            <div className="modal-actions">
              <button
                className="cancel-button"
                onClick={() => setShowBuyOfferModal(false)}
                disabled={buyOfferLoading}
              >
                Cancel
              </button>
              <button
                className="submit-button"
                onClick={handleSubmitBuyOffer}
                disabled={buyOfferLoading || !offerAmount}
              >
                {buyOfferLoading ? 'Creating Offer...' : 'Create Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

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

                <div className="vaultField">
                  <span className="fieldLabel">Fractionalized:</span>
                  <span
                    className={`status ${isAlreadyFractionalized ? "yes" : "no"}`}
                  >
                    {isAlreadyFractionalized ? "✅ Yes" : "❌ No"}
                  </span>
                </div>

                {/* Hiển thị thông tin fractionalization từ API chuyên dụng */}
                {isAlreadyFractionalized && (
                  <div className="fractionalizationInfo">
                    <h4>Fractionalization Details:</h4>
                    {fractionalizationLoading && (
                      <p className="loading">Loading fractionalization details...</p>
                    )}
                    {fractionalizationInfo && (
                      <>
                        <div className="vaultField">
                          <span className="fieldLabel">Token Mint:</span>
                          <div className="vaultAddress">
                            <code>{fractionalizationInfo.fractionalizationData.tokenMintAddress}</code>
                            <button
                              className="copyButton"
                              onClick={() => copyToClipboard(fractionalizationInfo.fractionalizationData.tokenMintAddress)}
                              title="Copy token mint address"
                            >
                              <IconCopy size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="vaultField">
                          <span className="fieldLabel">Token Balance:</span>
                          <span>{fractionalizationInfo.fractionalizationData.tokenBalance}</span>
                        </div>
                        <div className="vaultField">
                          <span className="fieldLabel">Fractionalized At:</span>
                          <span>
                            {new Date(fractionalizationInfo.fractionalizationData.fractionalizedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="vaultField">
                          <span className="fieldLabel">Transaction:</span>
                          <div className="vaultAddress">
                            <code>{fractionalizationInfo.fractionalizationData.transactionSignature}</code>
                            <button
                              className="copyButton"
                              onClick={() => copyToClipboard(fractionalizationInfo.fractionalizationData.transactionSignature)}
                              title="Copy transaction signature"
                            >
                              <IconCopy size={16} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    {!fractionalizationLoading && !fractionalizationInfo && isAlreadyFractionalized && (
                      <p className="error">Unable to load fractionalization details</p>
                    )}
                  </div>
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

          {/* Action Buttons Section */}
          {data.publicKey && (
            <div className="actionButtonsSection">
              {/* Fractionalize Button */}
              <button
                className={`actionButton fractionalizeButton ${isAlreadyFractionalized ? 'disabled' : ''}`}
                onClick={handleFractionalize}
                disabled={isAlreadyFractionalized || fractionalizingLoading}
              >
                <IconCoins size={20} />
                {fractionalizingLoading ? 'Fractionalizing...' :
                 isAlreadyFractionalized ? 'Already Fractionalized' : 'Fractionalize Vault'}
              </button>

              {/* Buy Offer Button - chỉ hiển thị nếu đã fractionalized */}
              {isAlreadyFractionalized && (
                <button
                  className="actionButton buyOfferButton"
                  onClick={handleBuyOffer}
                  disabled={buyOfferLoading}
                >
                  <IconCurrencyDollar size={20} />
                  Create Buy Offer
                </button>
              )}

              {!isAlreadyFractionalized && (
                <p className="actionInfo">
                  Fractionalize this vault to enable trading and buy offers
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostPage;
