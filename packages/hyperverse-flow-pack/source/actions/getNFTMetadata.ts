const fcl = require('@onflow/fcl');
const t = require('@onflow/types');

async function getNFTMetadata(tenantId: string, id: number, account: string) {
    try {
        const metadata = await fcl.send([
            fcl.script`
            import Pack from 0xPack
            import MetadataViews from 0x631e88ae7f1d7c20
                
            pub fun main(tenantID: Address, id: UInt64, account: Address): MetadataViews.Display? {
                                    
                let collection = getAccount(recipient).getCapability(Pack.CollectionPublicPath)
                                    .borrow<&Pack.Collection{Pack.PackCollectionPublic}>()
                                    ?? panic("Could not borrow the Pack.Collection{Pack.PackCollectionPublic}")
            
                if let resolver = collection.borrowViewResolver(id: id) {
                    if let view = resolver.resolveView(Type<MetadataViews.Display>()) {
                        return view as! Metadata
                    }
                }
            
                return nil
            }
            `,
            fcl.args([
                fcl.arg(tenantId, t.Address),
                fcl.arg(id, t.UInt64),
                fcl.arg(account, t.Address)
            ]),
        ]).then(fcl.decode);

        return metadata;
    } catch (error) {
        console.error(error);
    }
}

export { getNFTMetadata };
