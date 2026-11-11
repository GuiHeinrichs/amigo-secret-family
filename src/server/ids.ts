import { customAlphabet, nanoid } from "nanoid";

const suffix = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 6);

export const newId = () => nanoid(14);

/** Links pessoais: 24 caracteres de 64 símbolos ≈ 144 bits. */
export const newParticipantToken = () => `p${nanoid(24)}`;
export const newAdminToken = () => `a${nanoid(24)}`;

export function newSlug(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
  return `${base || "grupo"}-${suffix()}`;
}
