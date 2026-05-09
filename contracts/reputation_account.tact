import "./messages";

contract ReputationAccount {
    master: Address;
    owner: Address;
    reputation: Int as int32 = 1000;

    init(master: Address, owner: Address) {
        self.master = master;
        self.owner = owner;
    }

    receive(msg: InternalUpdateReputation) {
        require(sender() == self.master, "Only master can update reputation");
        self.reputation = self.reputation + msg.delta;
        if (self.reputation < 100) {
            self.reputation = 100;
        }
    }

    receive(msg: Vote) {
        require(sender() == self.owner, "Only owner can vote");
        
        // Forward the vote to the protocol master with reputation weight
        // The protocol master will route it to the correct Identity contract
        send(SendParameters{
            to: self.master,
            value: 0,
            mode: SendRemainingValue,
            body: ForwardVote{
                voter: self.owner,
                reputation: self.reputation,
                identityId: msg.identityId,
                cycleId: msg.cycleId,
                trackId: msg.trackId
            }.toCell()
        });
    }

    get fun reputation(): Int {
        return self.reputation;
    }

    get fun owner(): Address {
        return self.owner;
    }
}
