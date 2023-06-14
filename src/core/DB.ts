import sqlite3 from "sqlite3";
import { existsSync } from "fs";
import { getUnixTimestamp } from "./Utility";

export const dbInstance = new sqlite3.Database("./db.sqlite");
if (!existsSync("./db.sqlite")) {
    dbInstance.serialize(() => {
        dbInstance.run(`CREATE TABLE faucet_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT,
            user_id TEXT,
            "timestamp" INTEGER,
            used INTEGER DEFAULT (0)
        );`);
    });
}

type CheckCallback = (entryTimestamp: number | null) => Promise<void>;

// check timing
export const checkTimings = (userId: string, success: CheckCallback, failed: CheckCallback) => {
    dbInstance.serialize(async () => {
        try {
            let brk = false;
            dbInstance.each(`SELECT "timestamp"  FROM faucet_queue WHERE user_id = ? ORDER BY "timestamp" DESC LIMIT 1;`, [userId], async <T>(err: Error | null, row: T) => {
                brk = true;
                try {
                    if (err != null) {
                        await failed(null);
                        return;
                    }
                    const rowAny = row as any;
                    const timestamp = rowAny.timestamp as number;
                    const ts = getUnixTimestamp();
                    const mts = timestamp + parseInt(process.env.FAUCET_TIMESTAMP_LIMIT);
                    if (mts > ts) {
                        await failed(mts);
                        return;
                    }

                    await success(null);
                }
                catch (e1) {
                    console.error(`db failure (1) ${e1}`);
                }
            }, async () => {
                if (brk) return;
                await success(null);
            });
        }
        catch (e) {
            console.error(`db failure (0) ${e}`);
        }
    });
};