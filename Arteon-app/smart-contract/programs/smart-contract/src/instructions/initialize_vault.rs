use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount, MintTo, mint_to};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::constant::*;
use crate::error::*;

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: NFT mint address
    pub nft_mint: AccountInfo<'info>,
    
    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = vault
    )]
    pub nft_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = authority,
        space = Vault::LEN,
        seeds = [VAULT_SEED, nft_mint.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = vault,
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = token_mint,
        associated_token::authority = authority
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_vault(
    ctx: Context<InitializeVault>,
    artist_royalty_bps: u64,
    rent_price_per_day: Option<u64>,
) -> Result<()> {
    // Validate artist royalty
    require!(
        artist_royalty_bps <= 1000, // Max 10%
        ArteonError::ArtistRoyaltyExceedsMaximum
    );
    
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    // Initialize vault
    vault.authority = ctx.accounts.authority.key();
    vault.nft_mint = ctx.accounts.nft_mint.key();
    vault.nft_account = ctx.accounts.nft_account.key();
    vault.token_mint = ctx.accounts.token_mint.key();
    vault.total_supply = 0;
    vault.buyout_price = None;
    vault.buyout_vote_start = None;
    vault.buyout_vote_end = None;
    vault.total_votes = 0;
    vault.is_locked = false;
    vault.is_closed = false;
    vault.artist_royalty_bps = artist_royalty_bps;
    vault.platform_fee_bps = PLATFORM_FEE_BPS;
    vault.rent_price_per_day = rent_price_per_day;
    vault.is_rented = false;
    vault.rent_start = None;
    vault.rent_end = None;
    vault.current_renter = None;
    vault.bump = *ctx.bumps.get("vault").unwrap();
    
    msg!("Vault initialized successfully!");
    msg!("NFT Mint: {}", vault.nft_mint);
    msg!("Token Mint: {}", vault.token_mint);
    msg!("Artist Royalty: {} bps", vault.artist_royalty_bps);
    
    Ok(())
}