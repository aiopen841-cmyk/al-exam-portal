
import { createClient } from "@supabase/supabase-js";

// 1. ඔයාගේ ඇත්තම Supabase URL එක මෙතන දාන්න (උදා: "https://xyz.supabase.co")
const supabaseUrl = "https://kvlbukwawkuepwcvggae.supabase.co"; 

// 2. ඔයාගේ ඇත්තම Supabase Anon Key එක මෙතන දාන්න (උදා: "eyJhbGciOiJIUzI...")
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2bGJ1a3dhd2t1ZXB3Y3ZnZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxOTQwMjEsImV4cCI6MjA5Mjc3MDAyMX0.9CPw8q8kcIz810ZbttRDURO3EC9HLr1Mfl6NtO94C28";

// මේ ටික වෙනස් කරන්න එපා, මේකෙන් අගට එන වැඩිපුර කෑලි අයින් කරනවා
const normalizedSupabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(normalizedSupabaseUrl, supabaseAnonKey);