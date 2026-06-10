import { beforeEach, describe, expect, it } from 'vitest';
import { useAddressBookStore } from './addressBookStore';

describe('addressBookStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAddressBookStore.setState({ contacts: [] });
  });

  it('adds a contact with normalized email and display name', () => {
    const contact = useAddressBookStore.getState().upsertContact({
      name: '홍길동',
      email: ' FRIEND@Example.COM ',
    });

    expect(contact.email).toBe('friend@example.com');
    expect(contact.name).toBe('홍길동');
    expect(useAddressBookStore.getState().contacts).toHaveLength(1);
  });

  it('updates an existing contact instead of duplicating the same email', () => {
    useAddressBookStore.getState().upsertContact({ name: '홍길동', email: 'friend@example.com' });
    useAddressBookStore.getState().upsertContact({ name: '친구', email: 'FRIEND@example.com' });

    expect(useAddressBookStore.getState().contacts).toHaveLength(1);
    expect(useAddressBookStore.getState().contacts[0].name).toBe('친구');
  });

  it('rejects invalid emails', () => {
    expect(() =>
      useAddressBookStore.getState().upsertContact({ name: '오류', email: 'not-an-email' }),
    ).toThrow(/올바른 이메일/);
  });

  it('removes a contact by id and persists contacts', () => {
    const contact = useAddressBookStore.getState().upsertContact({
      name: '홍길동',
      email: 'friend@example.com',
    });

    useAddressBookStore.getState().removeContact(contact.id);

    expect(useAddressBookStore.getState().contacts).toEqual([]);
    const persisted = JSON.parse(localStorage.getItem('mdpro-address-book') ?? '{}');
    expect(persisted.state.contacts).toEqual([]);
  });
});
