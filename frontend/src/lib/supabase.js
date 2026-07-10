import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseKey);
export const supabaseConfigErrorMessage =
	'Supabase no esta configurado. Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en frontend/.env.';
export const isSupabaseConfigured = hasSupabaseEnv;

const fallbackError = {
	code: 'SUPABASE_NOT_CONFIGURED',
	message: supabaseConfigErrorMessage,
};

const createQueryBuilder = () => {
	const builder = {
		select: () => builder,
		insert: () => builder,
		update: () => builder,
		delete: () => builder,
		order: () => builder,
		eq: () => builder,
		ilike: () => builder,
		or: () => builder,
		limit: () => builder,
		range: () => builder,
		single: async () => ({ data: null, error: fallbackError }),
		maybeSingle: async () => ({ data: null, error: fallbackError }),
		then: (resolve) => resolve({ data: [], error: fallbackError })
	};

	return builder;
};

const createFallbackClient = () => ({
	from: () => createQueryBuilder(),
	rpc: async () => ({ data: null, error: fallbackError }),
	storage: {
		from: () => ({
			upload: async () => ({ data: null, error: fallbackError }),
			getPublicUrl: () => ({ data: { publicUrl: '' } })
		})
	}
});

export const supabase =
	hasSupabaseEnv
		? createClient(supabaseUrl, supabaseKey)
		: createFallbackClient();