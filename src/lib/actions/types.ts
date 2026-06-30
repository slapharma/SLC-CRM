// Shared, directive-free types for server actions (a "use server" module may only
// export async functions, so action state types must live in a neutral file).

export type AuthState = { error?: string; message?: string };

/** Generic server-action result for forms (create/edit). */
export type FormState = {
  error?: string;
  message?: string;
  /** Set by inline "quick-create" actions so a modal can select the new record. */
  created?: { id: string; name: string };
};
