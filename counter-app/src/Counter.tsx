import { Args, Client, ClientFactory, DefaultProviderUrls, IAccount } from '@massalabs/massa-web3';
import { useEffect, useState } from 'react';

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const baseAccount = {
    publicKey: 'P12cWsX8WkdEGdeZAN1wMK387MEi5sJW1N1R5fSMnqHXMBN4Jk2h',
    secretKey: 'S127o5vmigzpzx64SbsvdLawknMmxecWF5DR7jXvZK9XjedvzTdm',
    address: 'A1231h17jYujF2XdScmJu5hC2LRvmcckCQtRNhte3NDy9fTx9z1s',
} as IAccount;

const sc_addr = 'A1Y7tLTkFJMaiQLuVqZFMW3Vv4F451fJ8s1xwfFX5zL4Nrq7X7w';

function Counter() {
    const [web3client, setWeb3client] = useState<Client | null>(null);
    const [total, setTotal] = useState<string | null>(null);

    useEffect(() => {
        const initClient = async () => {
            const client = await ClientFactory.createDefaultClient(
                DefaultProviderUrls.TESTNET,
                false,
                baseAccount,
            );
            setWeb3client(client);
        };

        initClient().catch(console.error);
    }, []);

    async function listenEvent(operationId: string): Promise<string> {
        let loopCounter = 0;
        let event;
        while (loopCounter < 50) {
            try {
                event = await web3client?.smartContracts().getFilteredScOutputEvents({
                    emitter_address: null,
                    start: null,
                    end: null,
                    original_caller_address: null,
                    original_operation_id: operationId,
                    is_final: null,
                });
            } catch (error) {
                console.error(error);
                continue;
            }
            if (event != undefined && event[0]) {
                console.log(event);
                return event[0].data;
            }
            loopCounter++;
            await delay(5000);
        }
        return `Failed to catch event on operation ID: ${operationId}`;
    }

    async function funcIncrement(value: number) {
        const args = new Args();
        args.addU32(value);
        if (web3client) {
            const res = await web3client.smartContracts().callSmartContract({
                fee: 0,
                maxGas: 1000000,
                coins: 0,
                targetAddress: sc_addr,
                functionName: 'increment',
                parameter: args.serialize(),
            });
            console.log(await listenEvent(res));
        }
    }

    async function triggerValue() {
        const args = new Args();
        if (web3client) {
            const res = await web3client.smartContracts().callSmartContract({
                fee: 0,
                maxGas: 1000000,
                coins: 0,
                targetAddress: sc_addr,
                functionName: 'triggerValue',
                parameter: args.serialize(),
            });
            console.log(`Operation id: ${res}`);
            setTotal(await listenEvent(res));
        }
    }

    return (
        <div>
            <div>Total: {total ?? "Press the 'TriggerValue' button to get the actual value."}</div>
            <button onClick={async () => await funcIncrement(1)}>Increment</button>
            {web3client ? (
                <button
                    onClick={async () => {
                        await triggerValue();
                    }}
                >
                    TriggerValue
                </button>
            ) : (
                <div>loading</div>
            )}
        </div>
    );
}

export default Counter;
