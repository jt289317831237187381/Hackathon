import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';
import { currentUser } from './data/demoData';

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '#/';
  window.scrollTo = jest.fn();
});

test('visitors can browse the homepage and discovery catalogue without signing in', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'What people are weighing up' })).toBeInTheDocument();
  expect(screen.getByText(/first-party product experiences/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Discover' }));

  expect(await screen.findByRole('heading', { name: 'Discover products' })).toBeInTheDocument();
  expect(screen.getByText('15 products')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('credential sign-in returns to the protected save action', async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  const dialog = screen.getByRole('dialog');
  const auth = within(dialog);
  expect(auth.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();

  fireEvent.change(auth.getByLabelText('Username or email'), { target: { value: 'maya' } });
  fireEvent.change(auth.getByLabelText('Password', { selector: 'input' }), { target: { value: 'worthit123' } });
  fireEvent.click(auth.getAllByRole('button', { name: /^sign in$/i }).at(-1));

  await waitFor(() => {
    expect(JSON.parse(window.localStorage.getItem('worthit.session.v1')).displayName).toBe('Maya Chen');
    expect(JSON.parse(window.localStorage.getItem('worthit.saved.v1'))).toContain('auraflow-nc1');
  });
});

test('sign-up verifies a phone number before returning to the protected save action', async () => {
  render(<App />);

  fireEvent.click(screen.getAllByRole('button', { name: 'Save' })[0]);
  const dialog = screen.getByRole('dialog');
  const auth = within(dialog);
  fireEvent.click(auth.getByRole('button', { name: /^create account$/i }));

  expect(auth.getByRole('heading', { name: 'Create account' })).toBeInTheDocument();
  fireEvent.change(auth.getByLabelText('Email'), { target: { value: 'newmember@worthit.test' } });
  fireEvent.change(auth.getByLabelText('Username'), { target: { value: 'newmember' } });
  fireEvent.change(auth.getByLabelText(/^Password/, { selector: 'input' }), { target: { value: 'lasting123' } });
  fireEvent.change(auth.getByLabelText('Phone number', { selector: 'input' }), { target: { value: '412 345 678' } });
  fireEvent.click(auth.getByRole('button', { name: /continue to phone verification/i }));

  expect(await auth.findByRole('heading', { name: 'Verify your phone' })).toBeInTheDocument();
  fireEvent.change(auth.getByLabelText('Verification code'), { target: { value: '123456' } });
  fireEvent.click(auth.getByRole('button', { name: /verify phone & create account/i }));

  await waitFor(() => {
    const session = JSON.parse(window.localStorage.getItem('worthit.session.v1'));
    expect(session).toMatchObject({ username: 'newmember', email: 'newmember@worthit.test', phoneVerified: true });
    expect(JSON.parse(window.localStorage.getItem('worthit.saved.v1'))).toContain('auraflow-nc1');
  });
});

test('signed-in product pages keep community quality separate from personal need', async () => {
  window.localStorage.setItem('worthit.session.v1', JSON.stringify(currentUser));
  window.location.hash = '#/product/auraflow-nc1';
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Is it considered good?' })).toBeInTheDocument();
  expect(screen.getByText('from 127 community reviews')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Probably skip' })).toBeInTheDocument();
  expect(screen.getByText(/you already own drift 45 headphones/i)).toBeInTheDocument();
  expect(screen.getByText(/guidance, not financial advice/i)).toBeInTheDocument();
});
