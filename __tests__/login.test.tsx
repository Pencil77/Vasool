import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginPage from '../app/login/page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock Supabase client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockFromInsert = vi.fn();

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
    },
    from: vi.fn(() => ({
      insert: mockFromInsert,
    })),
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful sign-in mock
    mockSignInWithPassword.mockResolvedValue({
      error: null,
    });
    // Default successful sign-up mock
    mockSignUp.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null,
    });
    mockFromInsert.mockResolvedValue({
      error: null,
    });
  });

  it('renders the login form', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('handles sign in with valid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signInButton);

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('displays an error message on sign in failure', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signInButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(signInButton);

    expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('handles sign up with valid credentials', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'newuser@example.com');
    await user.type(passwordInput, 'newpassword123');
    await user.click(signUpButton);

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'newuser@example.com',
      password: 'newpassword123',
    });
    expect(mockFromInsert).toHaveBeenCalledTimes(1);
    expect(mockFromInsert).toHaveBeenCalledWith([
      { auth_id: 'test-user-id', username: 'newuser', is_admin: false },
    ]);
    expect(mockPush).toHaveBeenCalledWith('/home');
  });

  it('displays an error message on sign up failure', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: null,
      error: { message: 'User already exists' },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'anypassword');
    await user.click(signUpButton);

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
    expect(mockFromInsert).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('displays an error message on profile creation failure after sign up', async () => {
    mockFromInsert.mockResolvedValueOnce({
      error: { message: 'Failed to create profile' },
    });

    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const signUpButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'userwithprofileissue@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(signUpButton);

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockFromInsert).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/error creating user profile. please try again./i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
