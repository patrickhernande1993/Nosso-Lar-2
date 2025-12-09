import { createClient } from '@supabase/supabase-js';

// Credenciais fornecidas diretamente para garantir conexão estável
// Em aplicações Vite puramente client-side, essas chaves ficam expostas no bundle de qualquer forma.
const SUPABASE_URL = 'https://dxnohmqzsjwtszdecgnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bm9obXF6c2p3dHN6ZGVjZ25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MTkzMzAsImV4cCI6MjA3OTk5NTMzMH0.hhM9hKv8VEPWuwXX3Mvrl-345qHIwPm8vRllT8J53bI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);