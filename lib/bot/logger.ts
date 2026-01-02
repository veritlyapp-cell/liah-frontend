const Logger = {
    info: (msg: string, data?: any) => console.log(`[INFO] [BOT] ${msg}`, data || ''),
    warn: (msg: string, data?: any) => console.warn(`[WARN] [BOT] ${msg}`, data || ''),
    error: (msg: string, data?: any) => console.error(`[ERROR] [BOT] ${msg}`, data || ''),
    success: (msg: string, data?: any) => console.log(`[SUCCESS] [BOT] ${msg}`, data || '')
};

export default Logger;
