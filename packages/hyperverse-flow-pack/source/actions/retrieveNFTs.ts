const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
import { FlowTransaction } from '..';

async function retrieveNFTs(tenantId: string, recipient: string, withdrawID: number) {
    try {
        const transactionID = await fcl.send([
            fcl.transaction`
            import Pack from 0xPack
            import ExampleNFT from 0xExampleNFT
            
            transaction(tenantId: Address, withdrawPackID: UInt64, withdrawNFTID: UInt64) {
                let PackCollection: &Pack.Collection
                let NFTCollection: &NFT.Collection
                prepare(signer: AuthAccount) {
                    self.PackCollection = signer.borrow<&Pack.Collection>(from: Pack.CollectionStoragePath)
										?? panic("Could not borrow the Pack.Collection")
                    self.NFTCollection = signer.borrow<&ExampleNFT.Collection>(from: ExampleNFT.CollectionStoragePath)
                                                            ?? panic("Could not borrow the ExampleNFT.Collection")
                    
                }
                execute {
                    let pack <- self.PackCollection.withdraw(tenantId, withdrawID: withdrawPackID)

                    let nftCollection <- self.pack.retrieveNFTs()

                    let IDs = nftCollection.getIDs(tenantId)
                    
                    // A Pack can only contain one NFT. So we only have to deposit once.
                    self.NFTCollection.deposit(tenantId, token: <-nftCollection.withdraw(tenantId, withdrawID: IDs[0]))
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

export { retrieveNFTs };
