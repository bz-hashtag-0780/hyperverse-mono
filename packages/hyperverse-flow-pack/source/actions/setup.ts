const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
import { FlowTransaction } from '..';

async function setup() {
	try {
		const transactionID = await fcl.send([
			fcl.transaction`
				import Pack from 0xPack
				
				transaction() {
						prepare(signer: AuthAccount) {
								if signer.borrow<&Pack.Collection>(from: Pack.CollectionStoragePath) == nil {
									signer.save(<- Pack.createEmptyCollection(), to: Pack.CollectionStoragePath)
								  signer.link<&Pack.Collection{Pack.PackCollectionPublic}>(Pack.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
								}

								if signer.borrow<&Pack.NFTMinter>(from: Pack.MinterStoragePath) == nil {
									signer.save(<- Pack.createMinter(), to: Pack.MinterStoragePath)
								}
						}
						execute {
								
						}
				}
      `,
			fcl.args([]),
			fcl.payer(fcl.authz),
			fcl.proposer(fcl.authz),
			fcl.authorizations([fcl.authz]),
			fcl.limit(9999),
		])
			.then(fcl.decode);

		return fcl.tx(transactionID).onceSealed() as Promise<FlowTransaction>;
	} catch (error) {
		console.error(error);
	}
}

export { setup };
