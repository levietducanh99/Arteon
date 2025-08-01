use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Burn, burn};

use crate::state::*;
use crate::constant::*;
use crate::error::*;

#[derive(Accounts)]
pub struct Redeem<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED, vault.nft_mint.as_ref()],
        bump = vault.bump,
        constraint = !vault.is_closed @ ArteonError::VaultClosed,
        constraint = !vault.is_locked @ ArteonError::VaultLockedForBuyout
    )]
    pub vault: Account<'info, Vault>,
    
    #[account(
        mut,
        associated_token::mint = vault.token_mint,
        associated_token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        mint::authority = vault
    )]
    pub token_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
}

pub fn redeem(
    ctx: Context<Redeem>,
    amount: u64,
) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    
    // Validate amount
    require!(
        amount >= MIN_FRACTIONAL_AMOUNT,
        ArteonError::InvalidFractionAmount
    );
    
    // Check if user has enough tokens
    let user_balance = ctx.accounts.user_token_account.amount;
    require!(
        user_balance >= amount,
        ArteonError::InsufficientTokenBalance
    );
    
    // Calculate SOL amount based on vault's buyout price
    let sol_amount = if let Some(buyout_price) = vault.buyout_price {
        // Calculate proportional SOL amount
        let proportion = amount as f64 / vault.total_supply as f64;
        let raw_amount = (buyout_price as f64 * proportion) as u64;
        
        // Apply fees
        let platform_fee = (raw_amount * vault.platform_fee_bps) / 10000;
        let artist_royalty = (raw_amount * vault.artist_royalty_bps) / 10000;
        let user_amount = raw_amount - platform_fee - artist_royalty;
        
        user_amount
    } else {
        // If no buyout price, return 0 (user should wait for buyout)
        0
    };
    
    // Burn tokens
    let burn_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: vault.to_account_info(),
        },
        &[&[VAULT_SEED, vault.nft_mint.as_ref(), &[vault.bump]]],
    );
    
    burn(burn_ctx, amount)?;
    
    // Update vault total supply
    vault.total_supply = vault.total_supply.checked_sub(amount)
        .ok_or(ArteonError::InvalidFractionAmount)?;
    
    // Transfer SOL to user if there's a buyout price
    if sol_amount > 0 {
        **ctx.accounts.vault.try_borrow_mut_lamports()? -= sol_amount;
        **ctx.accounts.user.try_borrow_mut_lamports()? += sol_amount;
    }
    
    msg!("Redeem successful!");
    msg!("Burned {} tokens", amount);
    msg!("Received {} lamports", sol_amount);
    msg!("Remaining supply: {}", vault.total_supply);
    
    Ok(())
}
