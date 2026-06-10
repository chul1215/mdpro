import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AddressBookContact = {
  id: string;
  name: string;
  email: string;
  updatedAt: number;
};

type AddressBookState = {
  contacts: AddressBookContact[];
  upsertContact: (input: { name: string; email: string }) => AddressBookContact;
  removeContact: (id: string) => void;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) {
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  }
  return normalized;
}

function fallbackName(email: string): string {
  return email.split('@')[0] || email;
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set, get) => ({
      contacts: [],

      upsertContact: ({ name, email }) => {
        const normalizedEmail = assertEmail(email);
        const normalizedName = name.trim() || fallbackName(normalizedEmail);
        const now = Date.now();
        const existing = get().contacts.find((contact) => contact.email === normalizedEmail);
        const contact: AddressBookContact = {
          id: existing?.id ?? crypto.randomUUID(),
          name: normalizedName,
          email: normalizedEmail,
          updatedAt: now,
        };

        set((state) => ({
          contacts: [
            contact,
            ...state.contacts.filter((item) => item.email !== normalizedEmail),
          ].sort((a, b) => b.updatedAt - a.updatedAt),
        }));

        return contact;
      },

      removeContact: (id) => {
        set((state) => ({ contacts: state.contacts.filter((contact) => contact.id !== id) }));
      },
    }),
    {
      name: 'mdpro-address-book',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ contacts: state.contacts }),
    },
  ),
);
