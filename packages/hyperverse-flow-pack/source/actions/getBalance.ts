const fcl = require('@onflow/fcl');
const t = require('@onflow/types');

async function getBalance(tenantId: string, account: string) {
  console.log(account)
  try {
    const balance = await fcl.send([
      fcl.script`
				import Pack from 0xPack
						
				pub fun main(tenantID: Address, account: Address): Int {
																
						let collection = getAccount(account).getCapability(Pack.CollectionPublicPath)
																.borrow<&Pack.Collection{Pack.PackCollectionPublic}>()
																?? panic("Could not borrow the Pack.Collection{Pack.PackCollectionPublic}")
				
						return collection.getIDs(tenantID).length
				}
      `,
      fcl.args([
        fcl.arg(tenantId, t.Address),
        fcl.arg(account, t.Address)
      ]),
    ]).then(fcl.decode);

    return balance;
  } catch (error) {
    console.error(error);
  }
}

export { getBalance };
