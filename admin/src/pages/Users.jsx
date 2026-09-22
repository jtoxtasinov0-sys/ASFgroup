import { useEffect, useState } from 'react';
import { api, date } from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState(null);

  useEffect(() => {
    api.users().then(setUsers).catch(() => setUsers([]));
  }, []);

  return (
    <>
      <div className="page-head">
        <h1>Mijozlar</h1>
      </div>

      <div className="card">
        {users === null ? (
          <div className="center">
            <div className="spinner" />
          </div>
        ) : users.length === 0 ? (
          <div className="center">
            <div className="emoji">👥</div>
            Hali mijoz yo'q
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ism</th>
                  <th>Username</th>
                  <th>Telefon</th>
                  <th>Til</th>
                  <th>Buyurtmalar</th>
                  <th>Ro'yxatdan o'tgan</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <b>{[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}</b>
                      <div className="muted mono">ID: {user.telegramId}</div>
                    </td>
                    <td className="muted">{user.username ? `@${user.username}` : '—'}</td>
                    <td className="mono">{user.phone || '—'}</td>
                    <td>
                      <span className="badge off">{user.lang === 'ru' ? 'RU' : 'UZ'}</span>
                    </td>
                    <td className="mono">{user._count?.orders ?? 0}</td>
                    <td className="muted nowrap">{date(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
