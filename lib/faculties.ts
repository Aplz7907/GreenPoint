import type { SupabaseClient } from '@supabase/supabase-js';
import type { Faculty } from '@/lib/types';

/**
 * Reads the faculty list, tolerating a database that predates campus_th.
 *
 * schema.sql adds that column, but the file has to be replayed by hand against
 * a live project — and between deploying this code and running it, selecting a
 * column that does not exist makes PostgREST fail the whole request. That
 * emptied the list, and an empty list hides the picker altogether: the
 * registration form silently lost its คณะ field.
 *
 * So the campus-aware read is attempted first and a plain one is used if the
 * column is missing. After the migration the fallback never runs.
 */
export async function fetchFaculties(
  supabase: SupabaseClient
): Promise<Faculty[]> {
  const withCampus = await supabase
    .from('faculties')
    .select('id, name_th, campus_th, is_active')
    .eq('is_active', true)
    .order('name_th');

  if (!withCampus.error) return (withCampus.data ?? []) as Faculty[];

  const legacy = await supabase
    .from('faculties')
    .select('id, name_th, is_active')
    .eq('is_active', true)
    .order('name_th');

  // groupByCampus() files a null campus under "อื่น ๆ", so a pre-migration
  // database still renders every faculty — just in one unlabelled group.
  return (legacy.data ?? []).map((f) => ({ ...f, campus_th: null })) as Faculty[];
}
