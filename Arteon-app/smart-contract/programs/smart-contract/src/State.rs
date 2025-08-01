anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[account]
pub struct Vault {
    pub authority: Pubkey,           // Vault creator/artist
    pub nft_mint: Pubkey,            // NFT mint address
    pub nft_account: Pubkey,         // NFT token account in vault
    pub token_mint: Pubkey,          // Fractional token mint
    pub total_supply: u64,           // Total fractional tokens minted
    pub buyout_price: Option<u64>,   // Current buyout offer price
    pub buyout_vote_start: Option<i64>, // When buyout vote started
    pub buyout_vote_end: Option<i64>,   // When buyout vote ends
    pub total_votes: u64,            // Total votes cast for buyout
    pub is_locked: bool,             // Vault locked during buyout process
    pub is_closed: bool,             // Vault closed after successful buyout
    pub artist_royalty_bps: u64,     // Artist royalty in basis points
    pub platform_fee_bps: u64,       // Platform fee in basis points
    pub rent_price_per_day: Option<u64>, // Daily rent price in lamports
    pub is_rented: bool,             // Whether NFT is currently rented
    pub rent_start: Option<i64>,     // When current rent started
    pub rent_end: Option<i64>,       // When current rent ends
    pub current_renter: Option<Pubkey>, // Current renter
    pub bump: u8,                    // PDA bump
}

impl Vault {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // nft_mint
        32 + // nft_account
        32 + // token_mint
        8 +  // total_supply
        9 +  // buyout_price (Option<u64>)
        9 +  // buyout_vote_start (Option<i64>)
        9 +  // buyout_vote_end (Option<i64>)
        8 +  // total_votes
        1 +  // is_locked
        1 +  // is_closed
        8 +  // artist_royalty_bps
        8 +  // platform_fee_bps
        9 +  // rent_price_per_day (Option<u64>)
        1 +  // is_rented
        9 +  // rent_start (Option<i64>)
        9 +  // rent_end (Option<i64>)
        33 + // current_renter (Option<Pubkey>)
        1;   // bump
}

#[account]
pub struct Vote {
    pub vault: Pubkey,               // Associated vault
    pub voter: Pubkey,               // Voter's public key
    pub token_amount: u64,           // Amount of tokens voting
    pub vote_for_buyout: bool,       // Vote direction
    pub bump: u8,                    // PDA bump
}

impl Vote {
    pub const LEN: usize = 8 + // discriminator
        32 + // vault
        32 + // voter
        8 +  // token_amount
        1 +  // vote_for_buyout
        1;   // bump
}

#[account]
pub struct Config {
    pub authority: Pubkey,           // Program authority
    pub platform_fee_account: Pubkey, // Platform fee collection account
    pub default_platform_fee_bps: u64, // Default platform fee
    pub max_artist_royalty_bps: u64,   // Maximum artist royalty
    pub min_buyout_price: u64,       // Minimum buyout price
    pub bump: u8,                    // PDA bump
}

impl Config {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // platform_fee_account
        8 +  // default_platform_fps
        8 +  // max_artist_royalty_bps
        8 +  // min_buyout_price
        1;   // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum VaultStatus {
    Active,
    BuyoutVoting,
    BuyoutCompleted,
    Closed,
    Rented,
} 