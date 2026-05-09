message Deploy {
    queryId: Int as uint64;
}

message FactoryDeploy {
    queryId: Int as uint64;
    address: Address;
}

// Reputation Messages
message UpdateReputation {
    user: Address;
    delta: Int as int32;
    reason: String;
}

message InternalUpdateReputation {
    delta: Int as int32;
}

// Identity Messages
message CreateIdentity {
    name: String;
    seedParameters: String; // JSON or encoded parameters
}

message InternalInitializeIdentity {
    name: String;
    seedParameters: String;
}

message ProposeCycle {
    identityId: Int as uint32;
    parameters: CycleParameters;
}

struct CycleParameters {
    submissionStart: Int as uint32;
    submissionEnd: Int as uint32;
    voteStart: Int as uint32;
    voteEnd: Int as uint32;
    minQuorum: Int as uint32;
}

message InternalInitializeCycle {
    params: CycleParameters;
}

message Vote {
    identityId: Int as uint32;
    cycleId: Int as uint32;
    trackId: Int as uint32;
}

message ForwardVote {
    voter: Address;
    reputation: Int as int32;
    identityId: Int as uint32;
    cycleId: Int as uint32;
    trackId: Int as uint32;
}
