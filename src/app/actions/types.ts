export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echo of submitted values so a failed form keeps what the user typed. */
  values?: Record<string, string>;
};

export const initialState: ActionState = {};

export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && key !== "password" && !key.startsWith("$")) out[key] = value;
  });
  return out;
}
