import "./messages";

contract Cycle {
    identity: Address;
    id: Int as uint32;
    params: CycleParameters?;
    
    totalVotes: Int as int257 = 0;
    trackVotes: map<Int as uint32, Int as int257>; // trackId -> total reputation weight
    voted: map<Address, Bool>;
    
    init(identity: Address, id: Int as uint32) {
        self.identity = identity;
        self.id = id;
    }

    receive(msg: InternalInitializeCycle) {
        require(sender() == self.identity, "Only identity can initialize");
        self.params = msg.params;
    }

    receive(msg: ForwardVote) {
        require(sender() == self.identity, "Only identity can route votes");
        require(self.params != null, "Cycle not initialized");
        
        // In a real scenario, we would check the time:
        // let p: CycleParameters = self.params!!;
        // require(now() >= p.voteStart && now() <= p.voteEnd, "Not in voting window");
        
        require(self.voted.get(msg.voter) == null, "Already voted");
        
        self.voted.set(msg.voter, true);
        let weight: Int = msg.reputation;
        let currentTrackVotes: Int? = self.trackVotes.get(msg.trackId);
        if (currentTrackVotes == null) {
            self.trackVotes.set(msg.trackId, weight);
        } else {
            self.trackVotes.set(msg.trackId, currentTrackVotes!! + weight);
        }
        self.totalVotes = self.totalVotes + weight;
    }

    get fun totalVotes(): Int {
        return self.totalVotes;
    }

    get fun trackVotes(trackId: Int): Int {
        let v: Int? = self.trackVotes.get(trackId);
        if (v == null) {
            return 0;
        }
        return v!!;
    }

    get fun hasVoted(voter: Address): Bool {
        let v: Bool? = self.voted.get(voter);
        if (v == null) {
            return false;
        }
        return v!!;
    }
}
