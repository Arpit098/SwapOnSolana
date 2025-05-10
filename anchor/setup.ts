import { IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, Swap } from "./idl";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const programId = new PublicKey("CTdw25rSQUn5PBHnaGKkX9Q5yRgiiW6YdUJaUpQv2DZN"); 

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export const program = new Program<Swap>(IDL, {
  connection,
});


export type SwapData = IdlAccounts<Swap>[];