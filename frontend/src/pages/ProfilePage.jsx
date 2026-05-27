import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';
import { useState } from 'react';

export default function ProfilePage() {
  const { user, updateAccount } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await updateAccount(form);
      setMessage('Account updated successfully.');
      setForm((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="panel">
      <h1>My Profile</h1>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">Error: {error}</p>}

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input
            value={form.name}
            onChange={(event) =>
              setForm({ ...form, name: event.target.value })
            }
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm({ ...form, email: event.target.value })
            }
          />
        </label>

        <label>
          Current Password
          <input
            type="password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm({ ...form, currentPassword: event.target.value })
            }
            placeholder="Required only when changing password"
          />
        </label>

        <label>
          New Password
          <input
            type="password"
            value={form.newPassword}
            onChange={(event) =>
              setForm({ ...form, newPassword: event.target.value })
            }
            placeholder="Leave blank to keep current password"
          />
        </label>

        <button className="button" type="submit">
          Save Changes
        </button>
      </form>
    </section>
  );
}


