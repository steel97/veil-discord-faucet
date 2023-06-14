export const toTimeString = (totalSeconds: number) => {
    const totalMs = totalSeconds * 1000;
    const result = new Date(totalMs).toISOString().slice(11, 19);

    return result;
};
export const getUnixTimestamp = () => Math.round(Date.now() / 1000);
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));