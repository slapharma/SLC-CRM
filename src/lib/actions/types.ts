// Shared, directive-free types for server actions (a "use server" module may only
// export async functions, so action state types must live in a neutral file).

export type AuthState = { error?: string; message?: string };
