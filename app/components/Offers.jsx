'use client'

import React, { useState, useEffect } from 'react'
import { Card } from "./ui/card"
import { Button } from "./ui/button"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { program } from "../../anchor/setup"
import { 
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    ASSOCIATED_TOKEN_PROGRAM_ID,
createAssociatedTokenAccountInstruction} from "@solana/spl-token"
import { SystemProgram, PublicKey, Transaction } from "@solana/web3.js"
import BN from "bn.js"
import { useTrigger } from "./Trigger"

function truncateAddress(address, chars = 6) {
    return `${address?.slice(0, chars)}...${address?.slice(-chars)}`
}

function formatAmount(amount) {
    return (Number(amount) / 1_000_000_000).toString()
}

export default function AvailableOffers() {
    const { publicKey, sendTransaction } = useWallet()
    const { connection } = useConnection()
    const [hoveredItem, setHoveredItem] = useState(null)
    const [offers, setOffers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const { trigger, setTrigger } = useTrigger()

    useEffect(() => {
        const fetchOffers = async () => {
            if (!connection) {
                console.log("Connection not ready")
                setIsLoading(false)
                return
            }

            try {
                const accounts = await program.account.offer.all()
                console.log("Fetched accounts:", accounts)
                const fetchedOffers = accounts.map((account) => ({
                    pubkey: account.publicKey.toString(),
                    id: account.account.id.toString(),
                    maker: account.account.maker.toString(),
                    tokenMintA: account.account.tokenMintA.toString(),
                    tokenMintB: account.account.tokenMintB.toString(),
                    tokenAAmount: account.account.tokenAAmount.toString(),
                    tokenBAmount: account.account.tokenBAmount.toString(),
                    priceA: account.account.priceA,         // float, no toString()
                    priceB: account.account.priceB,         // float, no toString()
                    timestamp: account.account.timestamp.toString(),
                    bump: account.account.bump
                }))

                console.log("Fetched Offers:", fetchedOffers)
                setOffers(fetchedOffers)
            } catch (err) {
                console.error("Error fetching offers:", err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchOffers()
    }, [connection, trigger])

    const HandleAcceptOffer = async (offer) => {
    try {
        if (!publicKey || !connection) {
            throw new Error("Wallet not connected or no active connection")
        }

        const maker = new PublicKey(offer.maker)
        const tokenMintA = new PublicKey(offer.tokenMintA)
        const tokenMintB = new PublicKey(offer.tokenMintB)

        // Derive offer PDA
        const [offerPDA] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("offer"),
                maker.toBuffer(),
                new BN(offer.id).toArrayLike(Buffer, "le", 8)
            ],
            program.programId
        )

        // Get all token account addresses
        const takerTokenAccountA = await getAssociatedTokenAddress(
            tokenMintA,
            publicKey,
            false,
            TOKEN_PROGRAM_ID 
        )

        const takerTokenAccountB = await getAssociatedTokenAddress(
            tokenMintB,
            publicKey,
            false,
            TOKEN_PROGRAM_ID
        )

        const makerTokenAccountB = await getAssociatedTokenAddress(
            tokenMintB,
            maker,
            false,
            TOKEN_PROGRAM_ID
        )

        const vault = await getAssociatedTokenAddress(
            tokenMintA,
            offerPDA,
            true,
            TOKEN_PROGRAM_ID
        )

        // Create new transaction
        const transaction = new Transaction()

        // Check and create token accounts if needed
        const takerTokenBAccount = await connection.getAccountInfo(takerTokenAccountB)
        if (!takerTokenBAccount) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    takerTokenAccountB,
                    publicKey,
                    tokenMintB,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        const takerTokenAAccount = await connection.getAccountInfo(takerTokenAccountA)
        if (!takerTokenAAccount) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    takerTokenAccountA,
                    publicKey,
                    tokenMintA,
                    TOKEN_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            )
        }

        // Add take offer instruction
        const takeOfferIx = await program.methods
            .takeOffer()
            .accounts({
                taker: publicKey,
                maker: maker,
                tokenMintA: tokenMintA,
                tokenMintB: tokenMintB,
                takerTokenAccountA: takerTokenAccountA,
                takerTokenAccountB: takerTokenAccountB,
                makerTokenAccountB: makerTokenAccountB,
                offer: offerPDA,
                vault: vault,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
            })
            .instruction()

        transaction.add(takeOfferIx)

        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
        transaction.recentBlockhash = blockhash
        transaction.feePayer = publicKey

        // Send transaction
        const signature = await sendTransaction(transaction, connection, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3
        })

        // Confirm transaction
        await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
        })

        console.log("Transaction signature:", signature)
        setTrigger(!trigger)
        alert("Swap successful!")

    } catch (error) {
        console.error("Swap Error:", error)
        alert(`Error: ${error.message}`)
    }
}

    if (isLoading) {
        return <div>Loading offers...</div>
    }

    return (
        <div className="w-full max-w-4xl mx-auto mt-16">
            <h2 className="text-4xl md:text-4xl font-bold text-center mb-12 bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                Available Offers    
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {offers.map((offer, index) => (
                    <Card key={index} className="bg-gray-800/50 backdrop-blur-xl border-gray-700/50 shadow-lg shadow-purple-500/10 p-6">
                        <div className="space-y-5">
                            <div className="relative">
                                <p className="text-sm font-medium text-gray-300 mb-1">Offer Created Address:</p>
                                <p className="text-white text-lg font-medium cursor-pointer"
                                   onMouseEnter={() => setHoveredItem({ index, field: 'maker' })}
                                   onMouseLeave={() => setHoveredItem(null)}>
                                    {truncateAddress(offer.maker)}
                                </p>
                                {hoveredItem?.index === index && hoveredItem?.field === 'maker' && (
                                    <div className="absolute -top-2 left-0 transform -translate-y-full bg-gray-900/95 p-3 rounded-lg shadow-lg z-10">
                                        <p className="text-sm text-white break-all">{offer.maker}</p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-300 mb-1">Token Offered:</p>
                                <p className="text-white text-lg font-medium">
                                    {truncateAddress(offer.tokenMintA)}
                                </p>
                                <p className="text-sm font-medium text-gray-300 mt-2">Amount:</p>
                                <p className="text-white text-lg font-medium">
                                    {formatAmount(offer.tokenAAmount)}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm font-medium text-gray-300 mb-1">Token Wanted:</p>
                                <p className="text-white text-lg font-medium">
                                    {truncateAddress(offer.tokenMintB)}
                                </p>
                                <p className="text-sm font-medium text-gray-300 mt-2">Amount:</p>
                                <p className="text-white text-lg font-medium">
                                    {formatAmount(offer.tokenBAmount)}
                                </p>
                            </div>

                            <Button 
                                onClick={() => HandleAcceptOffer(offer)}
                                className="w-full mt-6 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white py-3 text-base font-semibold"
                            >
                                Accept Offer
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}