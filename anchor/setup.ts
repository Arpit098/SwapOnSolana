import { IdlAccounts, Program } from "@coral-xyz/anchor";
import { IDL, Swap } from "./idl";
import { clusterApiUrl, Connection, PublicKey } from "@solana/web3.js";

export const programId = new PublicKey("Ff4uecTxr2Gsp81rBdE1D7sW9Hn6cfNutnfJEmwaaAyS"); 

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

export const program = new Program<Swap>(IDL, {
  connection,
});


export type SwapData = IdlAccounts<Swap>[];