const fcl = require('@onflow/fcl');
const t = require('@onflow/types');
import { FlowTransaction } from '../types';

async function mintPack(recipient: string, name: string, image: string, description: string) {
	try {
		const transactionID = await fcl.send([
			fcl.transaction`
				import Pack from 0xPack

				transaction(recipient: Address, name: String, image: String, description: String) {
						let Minter: &Pack.NFTMinter
						let Recipient: &Pack.Collection{Pack.PackCollectionPublic}
						prepare(signer: AuthAccount) {
								self.Minter = signer.borrow<&Pack.NFTMinter>(from: Pack.MinterStoragePath)
																				?? panic("Could not borrow the Pack.Minter")
								self.Recipient = getAccount(recipient).getCapability(Pack.CollectionPublicPath)
																	.borrow<&Pack.Collection{Pack.PackCollectionPublic}>()
																	?? panic("Could not borrow the Pack.Collection{Pack.PackCollectionPublic}")
						}
						execute {
								self.Minter.mintPack(recipient: self.Recipient, name: name, image: image, description: description)
						}
				}
      `,
			fcl.args([
				fcl.arg(recipient, t.Address),
				fcl.arg(name, t.String),
				fcl.arg(image, t.String),
				fcl.arg(description, t.String),
			]),
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

export { mintPack };
