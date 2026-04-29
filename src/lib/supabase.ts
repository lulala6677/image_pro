import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase 客户端配置
// 环境变量: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

let supabaseAdminClient: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

/**
 * 获取前端使用的 Supabase 客户端（使用 ANON KEY）
 * 适用于客户端组件
 */
export function getSupabaseClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('缺少 Supabase 配置: NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }

  return supabaseClient;
}

/**
 * 获取服务端使用的 Supabase 客户端（使用 SERVICE ROLE KEY）
 * 适用于 API Routes，可绕过 RLS
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('缺少 Supabase 配置: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }

  return supabaseAdminClient;
}

export type { SupabaseClient };
