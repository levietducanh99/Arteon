anchor_lang::prelude::*;

#[error_code]
pub enum ArteonError {
    #[msg("Vault is not initialized")]
    VaultNotInitialized,
    
    #[msg("Vault is already initialized")]
    VaultAlreadyInitialized,
    
    #[msg("Insufficient token balance")]
    InsufficientTokenBalance,
    
    #[msg("Buyout vote is not active")]
    BuyoutVoteNotActive,
    
    #[msg("Buyout vote has expired")]
    BuyoutVoteExpired,
    
    #[msg("Quorum not reached for buyout")]
    QuorumNotReached,
    
    #[msg("Invalid buyout price")]
    InvalidBuyoutPrice,
    
    #[msg("NFT is not in vault")]
    NftNotInVault,
    
    #[msg("User already voted")]
    UserAlreadyVoted,
    
    #[msg("Invalid rent duration")]
    InvalidRentDuration,
    
    #[msg("NFT is currently rented")]
    NftCurrentlyRented,
    
    #[msg("Rent period not expired")]
    RentPeriodNotExpired,
    
    #[msg("Invalid fraction amount")]
    InvalidFractionAmount,
    
    #[msg("Vault is locked for buyout")]
    VaultLockedForBuyout,
    
    #[msg("Artist royalty exceeds maximum")]
    ArtistRoyaltyExceedsMaximum,
    
    #[msg("Platform fee exceeds maximum")]
    PlatformFeeExceedsMaximum,
    
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    
    #[msg("Invalid NFT mint")]
    InvalidNftMint,
    
    #[msg("Invalid NFT account")]
    InvalidNftAccount,
    
    #[msg("Unauthorized access")]
    UnauthorizedAccess,
    
    #[msg("Invalid metadata")]
    InvalidMetadata,
    
    #[msg("Vault is closed")]
    VaultClosed,
}