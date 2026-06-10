import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsertContact = vi.fn();
const removeContact = vi.fn();
let mockAddressBook = {
  contacts: [] as Array<{ id: string; name: string; email: string; updatedAt: number }>,
  upsertContact,
  removeContact,
};

vi.mock('../../stores/addressBookStore', () => ({
  useAddressBookStore: <T,>(selector: (state: typeof mockAddressBook) => T) =>
    selector(mockAddressBook),
}));

import { AddressBookPanel } from './AddressBookPanel';

describe('AddressBookPanel', () => {
  beforeEach(() => {
    upsertContact.mockReset();
    removeContact.mockReset();
    mockAddressBook = { contacts: [], upsertContact, removeContact };
  });

  it('adds a contact from name and email fields', async () => {
    render(<AddressBookPanel />);

    await userEvent.type(screen.getByRole('textbox', { name: '이름' }), '홍길동');
    await userEvent.type(screen.getByRole('textbox', { name: '이메일' }), 'friend@example.com');
    await userEvent.click(screen.getByRole('button', { name: '주소 추가' }));

    expect(upsertContact).toHaveBeenCalledWith({ name: '홍길동', email: 'friend@example.com' });
  });

  it('renders and removes saved contacts', async () => {
    mockAddressBook = {
      contacts: [{ id: 'contact-1', name: '홍길동', email: 'friend@example.com', updatedAt: 1234 }],
      upsertContact,
      removeContact,
    };

    render(<AddressBookPanel />);

    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByText('friend@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '홍길동 삭제' }));

    expect(removeContact).toHaveBeenCalledWith('contact-1');
  });
});
