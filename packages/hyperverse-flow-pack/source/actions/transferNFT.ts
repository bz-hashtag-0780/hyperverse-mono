const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
import { FlowTransaction } from '..';

async function transferNFT(tenantId: string, recipient: string, withdrawID: number) {
    try {
        const transactionID = await fcl.send([
            fcl.transaction`
            import Pack from 0xPack
            
            transaction(tenantId: Address, recipient: Address, withdrawID: UInt64) {
                let Collection: &Pack.Collection
                let Recipient: &Pack.Collection{Pack.PackCollectionPublic}
                prepare(signer: AuthAccount) {
                    self.Collection = signer.borrow<&Pack.Collection>(from: Pack.CollectionStoragePath)
										?? panic("Could not borrow the Pack.Collection")
                    self.Recipient = getAccount(recipient).getCapability(Pack.CollectionPublicPath)
                                                        .borrow<&Pack.Collection{Pack.PackCollectionPublic}>()
                                                        ?? panic("Could not borrow the Pack.Collection{Pack.PackCollectionPublic}")
                }
                execute {
                    let nft <- self.Collection.withdraw(tenantId, withdrawID: withdrawID)
                    self.Recipient.deposit(token: <- nft)
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

export { transferNFT };
