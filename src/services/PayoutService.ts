import { mainNetParams, Lightwallet, LightwalletAccount, LightwalletAddress, AccountType, CVeilAddress, CWatchOnlyTxWithIndex, CVeilRecipient, RpcRequester, GetRawMempool } from "veil-light";
import { sleep } from "../core/Utility";
import { dbInstance } from "../core/DB";
import { Client, TextChannel, hyperlink } from "discord.js";

const db = dbInstance;

const VEIL_EXPLORER_TX = process.env.VEIL_EXPLORER_TX;
const FAUCET_PAYOUTS_PER_CYCLE = parseInt(process.env.FAUCET_PAYOUTS_PER_CYCLE);
const FAUCET_PAYOUTS_AMOUNT = parseInt(process.env.FAUCET_PAYOUTS_AMOUNT);
const DISCORD_TARGET_CHANNEL_ID = process.env.DISCORD_TARGET_CHANNEL_ID;
RpcRequester.NODE_URL = process.env.VEIL_NODE_ADDRESS;
RpcRequester.NODE_PASSWORD = process.env.VEIL_NODE_PASSWORD;

interface TempAddress {
    id: number,
    recipient: CVeilRecipient
}

const processPayout = async (address: LightwalletAddress, client: Client) => {
    try {
        // get first 10 non-processed requests
        db.serialize(async () => {
            try {
                const addresses: Array<TempAddress> = [];
                db.each(`SELECT "id", "address"  FROM faucet_queue WHERE used=0 ORDER BY "timestamp" ASC LIMIT ${FAUCET_PAYOUTS_PER_CYCLE};`, async <T>(err: Error | null, row: T) => {
                    try {
                        const rowAny = row as any;
                        addresses.push({
                            id: rowAny.id,
                            recipient: {
                                address: CVeilAddress.parse(mainNetParams, rowAny.address),
                                amount: FAUCET_PAYOUTS_AMOUNT
                            }
                        });
                    }
                    catch (e2) {
                        console.error(`payout failed (2) ${e2}`);
                    }
                }, async () => {
                    try {
                        if (addresses.length == 0) return; // no addresses

                        const mempool = (await RpcRequester.send<GetRawMempool>({
                            jsonrpc: "1.0",
                            method: "getrawmempool",
                            params: []
                        })).result;

                        const recipients: Array<CVeilRecipient> = [];
                        addresses.forEach(a => recipients.push(a.recipient));
                        await address.fetchTxes();
                        const preparedUtxos = (await address.getUnspentOutputs()).filter(utxo => mempool.indexOf(utxo.getId() ?? "") === -1);
                        const utxos = preparedUtxos.sort((a, b) => a.getAmount(mainNetParams) - b.getAmount(mainNetParams));

                        const targetUtxos: Array<CWatchOnlyTxWithIndex> = [];
                        let targetAmount = 0;
                        recipients.forEach(a => targetAmount += a.amount);

                        let currentAmount = (Number(mainNetParams.CENT) / Number(mainNetParams.COIN)); // fee
                        for (const utxo of utxos) {
                            currentAmount += utxo.getAmount(mainNetParams);
                            targetUtxos.push(utxo);
                            if (currentAmount >= targetAmount)
                                break;
                        }
                        const actualBalance = await address.getBalance();

                        if (currentAmount >= targetAmount) {

                            const rawTx = await address.buildTransaction(recipients, targetUtxos, false);
                            if (rawTx == undefined) {
                                // error
                                console.error(`failed to build transaction!`);
                            } else {
                                const res = await Lightwallet.publishTransaction(rawTx.txid);
                                if (res == undefined || res.txid == null) {
                                    console.error(`failed to publish transaction! code = ${res.errorCode}, ${res.message}`);
                                } else {
                                    console.log(`Made payout, txid = ${res.txid}, count = ${recipients.length}`);

                                    // save state to db
                                    let query = "";
                                    for (let index = 0; index < addresses.length; index++) {
                                        query += `id = '${addresses[index].id}'`;
                                        if (index < addresses.length - 1) {
                                            query += " OR ";
                                        }
                                    }

                                    db.run(`UPDATE faucet_queue SET used = 1 WHERE ${query};`, async function (err: Error | null) {
                                        try {
                                            if (err != null) {
                                                console.error("failed to set 'used' for completed payout");
                                                return;
                                            }

                                            try {
                                                //const txlink = hyperlink("", `${VEIL_EXPLORER_TX}${res.txid}`, res.txid);
                                                await (client.channels.cache.get(DISCORD_TARGET_CHANNEL_ID) as TextChannel).send({
                                                    content: `Made payout to ${recipients.length} user(s)! tx: ${VEIL_EXPLORER_TX}${res.txid}`,
                                                    options: {
                                                        flags: "SuppressEmbeds"
                                                    }
                                                });
                                            } catch (e6) {
                                                console.error(`can't notify channel ${e6}`);
                                            }
                                        }
                                        catch (e4) {
                                            console.error("failed to set 'used' for completed payout");
                                        }
                                    });
                                }
                            }
                        } else {
                            if (actualBalance < targetAmount)
                                console.error(`not enough coins! ${currentAmount} < ${targetAmount}`);
                            else
                                console.log("waiting for change");
                        }
                    } catch (e3) {
                        console.error(`payout failed (3) ${e3}`);
                    }
                });
            }
            catch (e1) {
                console.error(`payout failed (1) ${e1}`);
            }
        });
        // set processed flag

    } catch (e) {
        console.error(`payout failed with ${e}`);
    }
};

export const runService = async (client: Client) => {
    const wallet = await Lightwallet.fromMnemonic(mainNetParams, process.env.VEIL_MNEMONIC.split(" "), process.env.VEIL_ENCRYPTION_PASSWORD ?? "");
    const account = new LightwalletAccount(wallet);
    const address = account.getAddress(AccountType.STEALTH);
    const delay = parseInt(process.env.FAUCET_PAYOUTS_DELAY ?? "60000");
    while (true) {
        await processPayout(address, client);
        await sleep(delay);
    }
};