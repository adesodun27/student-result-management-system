const SUPABASE_URL = "https://jifofnupmlppzbdhftny.supabase.co";
const SUPABASE_KEY = "sb_publishable_dXCCgqxFKaTAlK5y5CO-nw_xlHh0n09";


const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase client ready:", db ? "yes" : "no");
