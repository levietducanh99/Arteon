use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer, transfer};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::*;
use crate::constant::*;
use crate::error::*;

#[derive(Accounts)]
pub struct Buyout<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.nft_mint.as_ref()],
        bump = vault.bump,
        constraint = !vault.is_closed @ ArteonError::VaultClosed,
        constraint = vault.buyout_price.is_some() @ ArteonError::BuyoutVoteNotActive
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        associated_token::mint = vault.nft_mint,
        associated_token::authority = vault
    )]
    pub vault_nft_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = vault.nft_mint,
        associated_token::authority = buyer
    )]
    pub buyer_nft_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint = vault.token_mint,
        associated_token::authority = buyer
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Platform fee account
    #[account(mut)]
    pub platform_fee_account: AccountInfo<'info>,
    
    /// CHECK: Artist account
    #[account(mut)]
    pub artist_account: AccountInfo<'info>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn buyout(
    ctx: Context<Buyout>,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;
    
    // Check if buyout vote period has ended
    require!(
        vault.buyout_vote_end.is_some() && clock.unix_timestamp >= vault.buyout_vote_end.unwrap(),
        ArteonError::BuyoutVoteNotActive
    );
    
    // Check if quorum is reached
    let quorum_threshold = (vault.total_supply * QUORUM_PERCENTAGE) / 100;
    require!(
        vault.total_votes >= quorum_threshold,
        ArteonError::QuorumNotReached
    );
    
    let buyout_price = vault.buyout_price.unwrap();
    
    // Check if buyer has enough SOL
    let buyer_lamports = ctx.accounts.buyer.lamports();
    require!(
        buyer_lamports >= buyout_price,
        ArteonError::InsufficientTokenBalance
    );
    
    // Calculate fees
    let platform_fee = (buyout_price * vault.platform_fee_bps) / 10000;
    let artist_royalty = (buyout_price * vault.artist_royalty_bps) / 10000;
    let remaining_amount = buyout_price - platform_fee - artist_royalty;
    
    // Transfer SOL from buyer to vault
    **ctx.accounts.buyer.try_borrow_mut_lamports()? -= buyout_price;
    **ctx.accounts.vault.try_borrow_mut_lamports()? += remaining_amount;
    
    // Transfer platform fee
    **ctx.accounts.vault.try_borrow_mut_lamports()? -= platform_fee;
    **ctx.accounts.platform_fee_account.try_borrow_mut_lamports()? += platform_fee;
    
    // Transfer artist royalty
    **ctx.accounts.vault.try_borrow_mut_lamports()? -= artist_royalty;
    **ctx.accounts.artist_account.try_borrow_mut_lamports()? += artist_royalty;
    
    // Transfer NFT from vault to buyer
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_nft_account.to_account_info(),
            to: ctx.accounts.buyer_nft_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        &[&[VAULT_SEED, vault.nft_mint.as_ref(), &[vault.bump]]],
    );
    
    transfer(transfer_ctx, 1)?;
    
    // Update vault state
    vault.is_closed = true;
    vault.is_locked = false;
    vault.buyout_price = None;
    vault.buyout_vote_start = None;
    vault.buyout_vote_end = None;
    vault.total_votes = 0;
    
    msg!("Buyout successful!");
    msg!("NFT transferred to buyer: {}", ctx.accounts.buyer.key());
    msg!("Buyout price: {} lamports", buyout_price);
    msg!("Platform fee: {} lamports", platform_fee);
    msg!("Artist royalty: {} lamports", artist_royalty);
    msg!("Vault closed");
    
    Ok(())
}
