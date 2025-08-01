anchor_lang::prelude::*;

// Vault configuration
pub const VAULT_SEED: &[u8] = b"vault";
pub const VOTE_SEED: &[u8] = b"vote";
pub const CONFIG_SEED: &[u8] = b"config";

// Buyout configuration
pub const QUORUM_PERCENTAGE: u64 = 75; // 75% holders must vote to approve buyout
pub const VOTE_DURATION: i64 = 7 * 24 * 60 * 60; // 7 days in seconds
pub const MIN_FRACTIONAL_AMOUNT: u64 = 1_000_000; // 1 token (6 decimals)

// Token configuration
pub const TOKEN_DECIMALS: u8 = 6;
pub const INITIAL_SUPPLY: u64 = 1_000_000_000; // 1 billion tokens

// Fee configuration (in basis points - 100 = 1%)
pub const PLATFORM_FEE_BPS: u64 = 250; // 2.5%
pub const ARTIST_ROYALTY_BPS: u64 = 500; // 5%

// Rent configuration
pub const MIN_RENT_DURATION: i64 = 24 * 60 * 60; // 1 day
pub const MAX_RENT_DURATION: i64 = 30 * 24 * 60 * 60; // 30 days