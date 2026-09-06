// Supabase connection — shared by all pages
// Replace the two values below with your real ones from Supabase.

const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"; // paste your Project URL
const SUPABASE_KEY = "sb_publishable_xxxxxxxxxxxxx"; // paste your publishable key

// create the client (this is what every page uses to query the DB)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// quick connection test — logs to console, remove later
console.log("Supabase client ready:", supabase ? "yes" : "no");
