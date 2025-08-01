use anchor_lang::prelude::*;

declare_id!("6BoiezFL64ETgYVmNAE3w3di2qoQDEU6BMHt3Yqfe9XU");

#[program]
pub mod smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.authority = *ctx.accounts.user.key;
        counter.count = 0;
        msg!("Counter initialized to: {}", counter.count);
        Ok(())
    }

    pub fn increment(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        msg!("Counter incremented to: {}", counter.count);
        Ok(())
    }

    pub fn decrement(ctx: Context<Update>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        if counter.count == 0 {
            return Err(ErrorCode::CannotDecrementBelowZero.into());
        }
        counter.count -= 1;
        msg!("Counter decremented to: {}", counter.count);
        Ok(())
    }

    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        metadata_uri: String,
        total_supply: u64
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.metadata_uri = metadata_uri;
        vault.total_supply = total_supply;
        vault.is_fractionalized = false;
        vault.buyout_status = 0;

        msg!("Vault initialized with metadata: {}, total supply: {}",
            vault.metadata_uri, vault.total_supply);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + 8 + 32)]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, has_one = authority)]
    pub counter: Account<'info, Counter>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + // discriminator
               32 + // authority: Pubkey
               4 + 200 + // metadata_uri: String (4 bytes for length + max 200 chars)
               8 + // total_supply: u64
               1 + // is_fractionalized: bool
               1   // buyout_status: u8
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Counter {
    pub authority: Pubkey,
    pub count: u64,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub metadata_uri: String,
    pub total_supply: u64,
    pub is_fractionalized: bool,
    pub buyout_status: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Cannot decrement counter below zero")]
    CannotDecrementBelowZero,
}
