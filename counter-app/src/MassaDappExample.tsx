import React, { useState, useRef, useMemo, useEffect } from 'react';
import './App.css';
import { ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FileDrop } from 'react-file-drop';
import LoadingButton from '@mui/lab/LoadingButton';
import type {} from '@mui/lab/themeAugmentation';
import {
    Client,
    ClientFactory,
    DefaultProviderUrls,
    IAccount,
    IContractData,
    INodeStatus,
    WalletClient,
    WebsocketEvent,
} from '@massalabs/massa-web3';
import TextField from '@mui/material/TextField';
import useAsyncEffect from './utils/asyncEffect';
import { WORKER_OPERATION } from './worker/MassaWorker';

export const baseAccountSecretKey = 'S127o5vmigzpzx64SbsvdLawknMmxecWF5DR7jXvZK9XjedvzTdm';

interface IState {
    txHash: string | undefined;
    deploymentError: Error | undefined;
}

export const MassaDappCore: React.FunctionComponent = (): JSX.Element => {
    const fileInputRef = useRef(null);
    const [wasmFile, setWasmFile] = useState<File | null>(null);
    const [web3Client, setWeb3Client] = useState<Client | null>(null);
    const [deploymentState, setDeploymentState] = useState<IState>({
        deploymentError: undefined,
        txHash: undefined,
    });
    const [nodeStatus, setNodeStatus] = useState<INodeStatus | null>(null);

    const massaWorker: Worker = useMemo(
        () => new Worker(new URL('./worker/MassaWorker.ts', import.meta.url)),
        [],
    );

    useEffect(() => {
        if (window.Worker) {
            massaWorker.onmessage = (message: MessageEvent<any>) => {
                /**
                 * Add your onmessage implementation here!
                 */
            };
            massaWorker.onerror = (ev: ErrorEvent) => {
                /**
                 * Add your onerror implementation here!
                 */
            };
            setTimeout(() => massaWorker.postMessage(WORKER_OPERATION.RUN), 0);
        }
    }, [massaWorker]);

    useAsyncEffect(async () => {
        try {
            const baseAccount: IAccount = await WalletClient.getAccountFromSecretKey(
                baseAccountSecretKey,
            );
            const web3Client = await ClientFactory.createDefaultClient(
                DefaultProviderUrls.LABNET,
                true,
                baseAccount,
            );
            const nodeStatus = await web3Client.publicApi().getNodeStatus();
            const wsClient = web3Client.ws();
            if (wsClient) {
                wsClient.on(WebsocketEvent.ON_CLOSED, () => {
                    console.log('ws closed');
                });

                wsClient.on(WebsocketEvent.ON_CLOSING, () => {
                    console.log('ws closing');
                });

                wsClient.on(WebsocketEvent.ON_CONNECTING, () => {
                    console.log('ws connecting');
                });

                wsClient.on(WebsocketEvent.ON_OPEN, () => {
                    console.log('ws open');
                });

                wsClient.on(WebsocketEvent.ON_PING, () => {
                    console.log('ws ping');
                });

                wsClient.on(WebsocketEvent.ON_ERROR, (errorMessage) => {
                    console.error('ws error', errorMessage);
                });
                // connect to ws
                await wsClient.connect();

                // subscribe to new blocks and toast each message
                wsClient.subscribeNewBlocks((newBlock) => {
                    toast.info(`Block: ${newBlock.header.id.substring(0, 25)}...`, {
                        position: 'top-right',
                        autoClose: 0,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: false,
                        draggable: true,
                        progress: undefined,
                        delay: 0,
                        bodyStyle: { marginLeft: 0, fontSize: 15, width: 600 },
                        theme: 'light',
                    } as ToastOptions);
                });
            }
            setWeb3Client(web3Client);
            setNodeStatus(nodeStatus);
        } catch (error) {
            console.error(error);
            setDeploymentState({ ...deploymentState, deploymentError: error as Error });
        }
    }, []);

    const getNodeOverview = (nodeStatus: INodeStatus | null): JSX.Element => {
        if (!nodeStatus) {
            return <React.Fragment>{"Getting Massa's Node Status..."}</React.Fragment>;
        }
        return (
            <React.Fragment>
                Massa Net Version: {nodeStatus?.version}
                <br />
                Massa Net Node Id: {nodeStatus?.node_id}
                <br />
                Massa Net Node Ip: {nodeStatus?.node_ip}
                <br />
                Massa Net Time: {nodeStatus?.current_time}
                <br />
                Massa Net Cycle: {nodeStatus?.current_cycle}
                <br />
            </React.Fragment>
        );
    };

    const onDeployWasm = async () => {
        if (!web3Client) {
            return;
        }
        if (wasmFile) {
            toast(`Deploying wasm...`);
            const binaryArrayBuffer = await wasmFile.arrayBuffer();
            const binaryFileContents = new Uint8Array(binaryArrayBuffer);
            const contractDataBase64: string = Buffer.from(binaryFileContents).toString('base64');
            const key1: Uint8Array = Uint8Array.from([0, 1, 2, 3, 4]);
            const datastoreMap: Map<Uint8Array, Uint8Array> = new Map();
            datastoreMap.set(key1, binaryFileContents);
            try {
                const deployTxId = await web3Client.smartContracts().deploySmartContract({
                    fee: 0,
                    maxGas: 700000,
                    gasPrice: 0,
                    coins: 0,
                    contractDataBase64,
                    contractDataBinary: binaryFileContents,
                    datastore: datastoreMap,
                } as IContractData);
                toast.success(`Transaction id ${deployTxId}`, {
                    position: 'top-left',
                    autoClose: 0,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: true,
                    progress: undefined,
                    delay: 0,
                    bodyStyle: { marginLeft: 0, fontSize: 15, width: 600 },
                    theme: 'light',
                } as ToastOptions);
                setDeploymentState({ ...deploymentState, txHash: deployTxId });
            } catch (err) {
                console.error(err);
                setDeploymentState({ ...deploymentState, deploymentError: err as Error });
            }
        }
    };

    return (
        <React.Fragment>
            <ToastContainer />
            {getNodeOverview(nodeStatus)}
            <hr />
            <FileDrop
                onDrop={(files: FileList | null, event: React.DragEvent<HTMLDivElement>) => {
                    const loadedFile: File | null = files && files.length > 0 ? files[0] : null;
                    setWasmFile(loadedFile);
                }}
                onTargetClick={(event) => {
                    (fileInputRef.current as any).click();
                }}
            >
                {wasmFile
                    ? `Uploaded wasm file: ${wasmFile.name}`
                    : 'Drop or select your smart contract wasm file here!'}
            </FileDrop>
            <input
                onChange={(event) => {
                    const { files } = event.target;
                    const loadedFile: File | null = files && files.length > 0 ? files[0] : null;
                    setWasmFile(loadedFile);
                }}
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
            />
            <LoadingButton
                className="massa-button"
                variant="contained"
                color="primary"
                onClick={onDeployWasm}
                disabled={!wasmFile}
            >
                Deploy contract
            </LoadingButton>
            <TextField
                id="op-id"
                type="text"
                label="Operation Id"
                value={deploymentState.txHash || deploymentState.deploymentError?.message || ''}
                margin="normal"
                fullWidth
                disabled
                className="text-field"
                color="primary"
            />
        </React.Fragment>
    );
};
