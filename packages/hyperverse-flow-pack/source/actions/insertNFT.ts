const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
import { FlowTransaction } from '..';

async function insertNFT(tenantId: string, recipient: string, withdrawID: number) {
    try {
        const transactionID = await fcl.send([
            fcl.transaction`
            import Pack from 0xPack
            import ExampleNFT from 0xExampleNFT
            
            transaction(tenantId: Address, withdrawPackID: UInt64, withdrawNFTID: UInt64) {
                let PackCollection: &Pack.Collection
                let NFTCollection: &NFT.Collection
                let Minter: &Pack.NFTMinter
                prepare(signer: AuthAccount) {
                    self.PackCollection = signer.borrow<&Pack.Collection>(from: Pack.CollectionStoragePath)
										?? panic("Could not borrow the Pack.Collection")
                    self.NFTCollection = signer.borrow<&ExampleNFT.Collection>(from: ExampleNFT.CollectionStoragePath)
                                                            ?? panic("Could not borrow the ExampleNFT.Collection")
                    self.Minter = signer.borrow<&Pack.NFTMinter>(from: Pack.MinterStoragePath)
                                        ?? panic("Could not borrow the Pack.Minter")
                    
                }
                execute {
                    let pack <- self.PackCollection.withdraw(tenantId, withdrawID: withdrawPackID)
                    let nft <- self.NFTCollection.withdraw(tenantId, withdrawID: withdrawNFTID)

                    let filledPack <- self.Minter.insertNFT(pack: pack, nft: nft)

                    self.PackCollection.deposit(tenantId, token: <-filledPack)
                }
            }
            `,
            fcl.args([
                fcl.arg(tenantId, t.Address),
                fcl.arg(recipient, t.Address),
                fcl.arg(withdrawID, t.UInt64)
            ]),
            fcl.payer(fcl.authz),
            fcl.proposer(fcl.authz),
            fcl.authorizations([fcl.authz]),
            fcl.limit(9999),
        ]).then(fcl.decode);

        return fcl.tx(transactionID).onceSealed() as Promise<FlowTransaction>;
    } catch (error) {
        console.error(error);
    }
}

export { insertNFT };
