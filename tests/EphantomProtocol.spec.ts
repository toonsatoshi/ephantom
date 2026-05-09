import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { EphantomProtocol } from '../build/ephantom_protocol/ephantom_protocol_EphantomProtocol';
import { ReputationAccount } from '../build/ephantom_protocol/ephantom_protocol_ReputationAccount';
import { Identity } from '../build/ephantom_protocol/ephantom_protocol_Identity';
import { Cycle } from '../build/ephantom_protocol/ephantom_protocol_Cycle';
import '@ton/test-utils';

describe('EphantomProtocol', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let protocol: SandboxContract<EphantomProtocol>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        protocol = blockchain.openContract(await EphantomProtocol.fromInit());

        const deployResult = await protocol.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            { $$type: 'Deploy', queryId: 0n }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: protocol.address,
            deploy: true,
            success: true,
        });
    });

    it('should update reputation', async () => {
        const user = await blockchain.treasury('user');
        const delta = 100;

        const result = await protocol.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            { $$type: 'UpdateReputation', user: user.address, delta: BigInt(delta), reason: 'First update' }
        );

        const repAddress = await protocol.getReputationAddress(user.address);
        const repContract = blockchain.openContract(ReputationAccount.fromAddress(repAddress));

        expect(result.transactions).toHaveTransaction({
            from: protocol.address,
            to: repAddress,
            success: true,
        });

        const reputation = await repContract.getReputation();
        expect(reputation).toBe(1100n); // Initial 1000 + 100
    });

    it('should create identity', async () => {
        const name = "Cybernetic Folk";
        const seedParams = "{}";

        const result = await protocol.send(
            deployer.getSender(),
            { value: toNano('0.2') },
            { $$type: 'CreateIdentity', name, seedParameters: seedParams }
        );

        const identityId = 0n;
        const identityAddress = await protocol.getIdentityAddress(identityId);
        const identityContract = blockchain.openContract(Identity.fromAddress(identityAddress));

        expect(result.transactions).toHaveTransaction({
            from: protocol.address,
            to: identityAddress,
            success: true,
        });

        const details = await identityContract.getDetails();
        expect(details).toBe(name);
        
        const initialized = await identityContract.getInitialized();
        expect(initialized).toBe(true);
    });

    it('should propose a cycle and record votes', async () => {
        const user = await blockchain.treasury('user');
        
        // 1. Setup
        await protocol.send(deployer.getSender(), { value: toNano('0.1') }, { $$type: 'UpdateReputation', user: user.address, delta: 0n, reason: 'Init' });
        await protocol.send(deployer.getSender(), { value: toNano('0.2') }, { $$type: 'CreateIdentity', name: "Test", seedParameters: "{}" });

        const identityAddress = await protocol.getIdentityAddress(0n);
        const identityContract = blockchain.openContract(Identity.fromAddress(identityAddress));

        // 2. Propose Cycle
        const cycleParams = {
            $$type: 'CycleParameters' as const,
            submissionStart: 0n,
            submissionEnd: 100n,
            voteStart: 0n,
            voteEnd: 100n,
            minQuorum: 1n,
        };

        await identityContract.send(
            deployer.getSender(), 
            { value: toNano('0.2') },
            { $$type: 'ProposeCycle', identityId: 0n, parameters: cycleParams }
        );

        const cycleAddress = (await identityContract.getCycleAddress(0n))!;
        const cycleContract = blockchain.openContract(Cycle.fromAddress(cycleAddress));

        // 3. Vote
        const repAddress = await protocol.getReputationAddress(user.address);
        const repContract = blockchain.openContract(ReputationAccount.fromAddress(repAddress));

        const voteResult = await repContract.send(
            user.getSender(),
            { value: toNano('0.1') },
            { $$type: 'Vote', identityId: 0n, cycleId: 0n, trackId: 5n }
        );

        expect(voteResult.transactions).toHaveTransaction({
            from: protocol.address,
            to: identityAddress,
            success: true,
        });
        
        expect(voteResult.transactions).toHaveTransaction({
            from: identityAddress,
            to: cycleAddress,
            success: true,
        });

        // 4. Verify
        const totalVotes = await cycleContract.getTotalVotes();
        expect(totalVotes).toBe(1000n); // Initial reputation

        const trackVotes = await cycleContract.getTrackVotes(5n);
        expect(trackVotes).toBe(1000n);
        
        const hasVoted = await cycleContract.getHasVoted(user.address);
        expect(hasVoted).toBe(true);
    });
});
