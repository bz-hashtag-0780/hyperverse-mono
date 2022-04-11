const fcl = require('@onflow/fcl');
const t = require('@onflow/types');

async function getNFTIDs(tenantId: string, account: string) {
	try {
		const ids = await fcl.send([
			fcl.script`
				import Pack from 0xPack
						
				pub fun main(tenantID: Address, account: Address): [UInt64] {
																
						let collection = getAccount(account).getCapability(Pack.CollectionPublicPath)
																.borrow<&Pack.Collection{Pack.PackCollectionPublic}>()
																?? panic("Could not borrow the Pack.Collection{Pack.PackCollectionPublic}")
				
						return collection.getIDs(tenantID)
				}
      `,
			fcl.args([
				fcl.arg(tenantId, t.Address),
				fcl.arg(account, t.Address)
			]),
		]).then(fcl.decode);

		return ids;
	} catch (error) {
		console.error(error);
	}
}

export { getNFTIDs };
