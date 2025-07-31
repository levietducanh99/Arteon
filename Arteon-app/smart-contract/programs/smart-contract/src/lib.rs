use anchor_lang::prelude::*;

declare_id!("6BoiezFL64ETgYVmNAE3w3di2qoQDEU6BMHt3Yqfe9XU");

#[program]
pub mod smart_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
