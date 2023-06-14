import { ModalSubmitInteraction } from "discord.js";
import { checkTimings, dbInstance } from "../core/DB";
import { mainNetParams, CVeilAddress } from "veil-light";
import "dotenv/config"
import { getUnixTimestamp, toTimeString } from "../core/Utility";

const db = dbInstance;
export const modalId = "addressModal";

// sorry for callback hell
const addToQueue = async (addressVal: string, interaction: ModalSubmitInteraction) => {
    // add to queue
    db.serialize(() => {
        try {
            db.run(`INSERT INTO faucet_queue (address, user_id, "timestamp", used) VALUES(?, ?, ${getUnixTimestamp()}, 0);`, [addressVal, interaction.user.id], async function (err: Error | null) {
                try {
                    if (err != null) {
                        await interaction.reply({ content: 'Failed to add user to queue!' });
                        return;
                    }
                    //const queueId = res.lastID;
                    db.serialize(() => {
                        try {
                            db.each(`SELECT COUNT(*) as cnt FROM faucet_queue WHERE used = 0;`, async <T>(err: Error | null, row: T) => {
                                try {
                                    const rowAny = row as any;
                                    // notify user
                                    await interaction.reply({ content: `You successfully added to queue! Queue size: ${rowAny.cnt}` });
                                }
                                catch (e5) {
                                    console.error(`db failure (5) ${e5}`);
                                }
                            });
                        }
                        catch (e4) {
                            console.error(`db failure (4) ${e4}`);
                        }
                    });
                }
                catch (e3) {
                    console.error(`db failure (3) ${e3}`);
                }
            });
        }
        catch (e2) {
            console.error(`db failure (2) ${e2}`);
        }
    });
};

export const execute = async (interaction: ModalSubmitInteraction) => {
    try {
        const addressVal = interaction.fields.getTextInputValue('addressInput');
        // check address validity
        try {
            CVeilAddress.parse(mainNetParams, addressVal);
            // check timing
            checkTimings(interaction.user.id, async () => {
                await addToQueue(addressVal, interaction);
            }, async (entryTimestamp: number | null) => {
                if (entryTimestamp != null)
                    await interaction.reply({ content: `Too early! You can request free coins after ${toTimeString(entryTimestamp - getUnixTimestamp())}` });
                else
                    await interaction.reply({ content: "Failed to check timestamp!" });
            });
        } catch {
            await interaction.reply({ content: "Specified address seems to be invalid, please try again!" });
        }
    } catch (e) {

    }
};
