import "./messages";
import "./reputation_account";
import "./identity";

contract EphantomProtocol {
    owner: Address;
    nextIdentityId: Int as uint32 = 0;
    
    init() {
        self.owner = sender();
    }

    receive(deploy: Deploy) {
        self.reply("deployed".asComment());
    }

    receive(msg: UpdateReputation) {
        require(sender() == self.owner, "Only owner can update reputation");
        let init: StateInit = initOf ReputationAccount(myAddress(), msg.user);
        let address: Address = contractAddress(init);
        send(SendParameters{
            to: address,
            value: ton("0.05"), 
            mode: SendIgnoreErrors,
            body: InternalUpdateReputation{delta: msg.delta}.toCell(),
            code: init.code,
            data: init.data
        });
    }

    receive(msg: CreateIdentity) {
        require(sender() == self.owner, "Only owner can create identity");
        let init: StateInit = initOf Identity(myAddress(), self.nextIdentityId);
        let address: Address = contractAddress(init);
        
        send(SendParameters{
            to: address,
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            body: InternalInitializeIdentity{name: msg.name, seedParameters: msg.seedParameters}.toCell(),
            code: init.code,
            data: init.data
        });

        self.nextIdentityId = self.nextIdentityId + 1;
    }

    receive(msg: ForwardVote) {
        // Verify it comes from a valid reputation account
        let expectedInit: StateInit = initOf ReputationAccount(myAddress(), msg.voter);
        require(sender() == contractAddress(expectedInit), "Invalid reputation account");
        
        // Route to the correct Identity contract
        let identityInit: StateInit = initOf Identity(myAddress(), msg.identityId);
        let identityAddress: Address = contractAddress(identityInit);
        
        send(SendParameters{
            to: identityAddress,
            value: 0,
            mode: SendRemainingValue,
            body: msg.toCell()
        });
    }

    get fun reputationAddress(user: Address): Address {
        return contractAddress(initOf ReputationAccount(myAddress(), user));
    }

    get fun identityAddress(id: Int): Address {
        return contractAddress(initOf Identity(myAddress(), id));
    }

    get fun nextIdentityId(): Int {
        return self.nextIdentityId;
    }

    get fun owner(): Address {
        return self.owner;
    }
}
