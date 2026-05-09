import "./messages";
import "./cycle";

contract Identity {
    master: Address;
    id: Int as uint32;
    name: String = "";
    seedParameters: String = "";
    initialized: Bool = false;
    
    currentCycleId: Int as uint32 = 0;
    cycles: map<Int as uint32, Address>;
    
    init(master: Address, id: Int as uint32) {
        self.master = master;
        self.id = id;
    }

    receive(msg: InternalInitializeIdentity) {
        require(sender() == self.master, "Only master can initialize");
        require(!self.initialized, "Already initialized");
        self.name = msg.name;
        self.seedParameters = msg.seedParameters;
        self.initialized = true;
    }

    receive(msg: ProposeCycle) {
        // In a real scenario, we might want to restrict who can propose
        // require(sender() == self.master || sender() == self.owner, "Unauthorized");
        
        let init: StateInit = initOf Cycle(myAddress(), self.currentCycleId);
        let address: Address = contractAddress(init);
        self.cycles.set(self.currentCycleId, address);
        
        send(SendParameters{
            to: address,
            value: ton("0.1"),
            mode: SendIgnoreErrors,
            body: InternalInitializeCycle{params: msg.parameters}.toCell(),
            code: init.code,
            data: init.data
        });

        self.currentCycleId = self.currentCycleId + 1;
    }
    
    receive(msg: ForwardVote) {
        require(sender() == self.master, "Only master can route votes");
        require(msg.identityId == self.id, "Wrong identity ID");
        
        let cycleAddress: Address? = self.cycles.get(msg.cycleId);
        if (cycleAddress != null) {
            send(SendParameters{
                to: cycleAddress!!,
                value: 0,
                mode: SendRemainingValue,
                body: msg.toCell()
            });
        }
    }

    get fun details(): String {
        return self.name;
    }

    get fun id(): Int {
        return self.id;
    }

    get fun initialized(): Bool {
        return self.initialized;
    }

    get fun currentCycleId(): Int {
        return self.currentCycleId;
    }

    get fun cycleAddress(cycleId: Int): Address? {
        return self.cycles.get(cycleId);
    }
}
