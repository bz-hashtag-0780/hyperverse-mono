import MetadataViews from "./MetadataViews.cdc"
import NonFungibleToken from "./NonFungibleToken.cdc"

pub contract Pack {

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    pub event ContractInitialized()
    pub event Withdraw(_ tenant: Address, id: UInt64, from: Address?)
    pub event Deposit(_ tenant: Address, id: UInt64, to: Address?)
    pub event PackOpened(_ tenant: Address, id: UInt64, name: String)
    pub event PackMinted(_ tenant: Address, id: UInt64, name: String)

    // -----------------------------------------------------------------------
    // Named Paths
    // -----------------------------------------------------------------------
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let MinterStoragePath: StoragePath

    // -----------------------------------------------------------------------
    // Contract Fields
    // -----------------------------------------------------------------------
    pub var totalSupply: {Address: UInt64}

    pub resource interface Public {
        pub let id: UInt64
        pub let tenant: Address
        pub let name: String
        // IPFS CID
        pub let image: String
        pub let description: String
        pub var opened: Bool
        access(contract) var NFTs: @{UInt64: NonFungibleToken.NFT}
        pub fun isOpened(): Bool
        pub fun containsNFT(): Bool
        pub fun getNumberOfNFTs(): Int
    }

    pub resource NFT: Public, MetadataViews.Resolver {
        pub let id: UInt64
        pub let tenant: Address
        pub let name: String
        pub let image: String
        pub let description: String
        pub var opened: Bool
        access(contract) var NFTs: @{UInt64: NonFungibleToken.NFT}

        init(
            _ tenant: Address,
            id: UInt64,
            name: String, 
            image: String, 
            description: String
            ) {
            pre {
                name != "": "Can't mint pack: name can't be blank"
                image != "": "Can't mint pack: image can't be blank"
                description != "": "Can't mint pack: description can't be blank"
            }
            self.tenant = tenant
            self.id = id
            self.name = name
            self.image = image
            self.description = description
            self.opened = false
            self.NFTs = {}
        }

        pub fun retrieveNFTs(): @NonFungibleToken.Collection {
            pre {
                self.containsNFT(): "Can't retrieve NFT: Pack does not contain an NFT"
            }

            let keys = self.NFTs.keys

            let nftCollection <- NonFungibleToken.createEmptyCollection() as! @NonFungibleToken.Collection

            let token <- self.NFTs.remove(key: keys[0])!

            nftCollection.deposit(token: <- token)

            self.updateIsOpened()

            emit PackOpened(tenant, id: self.id, name: self.name)

            return <- nftCollection
        }

        access(self) fun updateIsOpened() {
            if(self.NFTs.keys.length == 0) {
                self.opened = true
            }
        }

        pub fun isOpened(): Bool {
            return self.opened
        }

        pub fun containsNFT(): Bool {
            return self.NFTs.keys.length > 0
        }

        pub fun getNumberOfNFTs(): Int {
            return self.NFTs.keys.length
        }
    
        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.name,
					    description: self.description,
					    thumbnail: MetadataViews.IPFSFile(cid: self.image, path: nil)
                        )
                    )
            }

            return nil
        }

        destroy() {
            assert(self.NFTs.keys.length == 0, message: "Can't destroy Pack with NFTs within")
            destroy self.NFTs
        }
    }

    pub resource interface PackCollectionPublic {
        pub fun deposit(token: @NFT)
        pub fun getIDs(_ tenant: Address): [UInt64]
        pub fun borrowNFT(_ tenant: Address, id: UInt64): &NFT
        pub fun borrowPack(_ tenant: Address, id: UInt64): &Pack.NFT? {
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow Pack reference: the ID of the returned reference is incorrect"
            }
        }
    }

    pub resource Collection: PackCollectionPublic {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{Address: {UInt64: NFT}}

        init () {
            self.ownedNFTs <- {}
        }

        // withdraw removes an NFT from the collection and moves it to the caller
        pub fun withdraw(_ tenant: Address, withdrawID: UInt64): @NFT {
            let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
            let token <- collection.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(tenant, id: token.id, from: self.owner?.address)

            return <-token
        }

        // deposit takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        pub fun deposit(token: @NFT) {
            let token <- token as! @Pack.NFT

            let tenant: Address = token.tenant
            let id: UInt64 = token.id

            if self.ownedNFTs[tenant] != nil {
                let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
                // add the new token to the dictionary which removes the old one
                collection[id] <-! token
            } else {
                self.ownedNFTs[tenant] <-! {id: <- token}
            }

            emit Deposit(tenant, id: id, to: self.owner?.address)
        }

        // getIDs returns an array of the IDs that are in the collection
        pub fun getIDs(_ tenant: Address): [UInt64] {
            if self.ownedNFTs[tenant] != nil {
                let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
                return collection.keys
            }
            return []
        }

        // borrowNFT gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        pub fun borrowNFT(_ tenant: Address, id: UInt64): &NFT {
            let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
            return &collection[id] as &NFT
        }
 
        pub fun borrowPack(_ tenant: Address, id: UInt64): &Pack.NFT? {
            let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
            if collection[id] != nil {
                // Create an authorized reference to allow downcasting
                let ref = &collection[id] as auth &NFT
                return ref as! &Pack.NFT
            }

            return nil
        }

        pub fun borrowViewResolver(_ tenant: Address, id: UInt64): &AnyResource{MetadataViews.Resolver} {
            let collection = &self.ownedNFTs[tenant] as &{UInt64: NFT}
            let nft = &collection[id] as auth &NFT
            let PackNFT = nft as! &Pack.NFT
            return PackNFT as &AnyResource{MetadataViews.Resolver}
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    // public function that anyone can call to create a new empty collection
    pub fun createEmptyCollection(): @Collection {
        return <- create Collection()
    }

    // Resource that an admin or something similar would own to be
    // able to mint new NFTs
    //
    pub resource NFTMinter {

        // mintPack mints a new Pack with a new ID
        // and deposit it in the recipients collection using their collection reference
        // Notice: Should be updated so a user won't end up receive an empty pack
        pub fun mintPack(
            recipient: &Collection{PackCollectionPublic},
            name: String,
            image: String,
            description: String
        ) {
            let tenant = self.owner!.address
            if Pack.totalSupply[tenant] == nil {
                Pack.totalSupply[tenant] = 0
            }
            // create a new NFT
            var newPack <- create NFT(
                tenant,
                id: Pack.totalSupply[tenant]!,
                name: name, 
                image: image, 
                description: description
            )

            emit PackMinted(tenant, id: newPack.id, name: newPack.name)

            // deposit it in the recipient's account using their reference
            recipient.deposit(token: <-newPack)

            Pack.totalSupply[tenant] = Pack.totalSupply[tenant]! + 1
        }

        pub fun insertNFT(pack: @Pack.NFT, nft: @NonFungibleToken.NFT): @Pack.NFT {
            pre {
                pack.NFTs.keys.length == 0: "Can't insert NFT into Pack: Pack already contain an NFT"
                !pack.isOpened(): "Can't insert NFT into Pack: Pack has already been opened"
            }
            let id = nft.id
            pack.NFTs[id] <-! nft
            return <- pack
        }
    }

    pub fun createMinter(): @NFTMinter {
        return <- create NFTMinter()
    }

    init() {
        // Initialize the total supply
        self.totalSupply = {}

        // Set the named paths
        self.CollectionStoragePath = /storage/hyperversePackCollection
        self.CollectionPublicPath = /public/hyperversePackCollection
        self.MinterStoragePath = /storage/hyperversePackMinter

        emit ContractInitialized()
    }
}