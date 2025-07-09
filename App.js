import React, { useState, useEffect } from 'react';
import './index.css';

export default function App() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      setMessage('⚠️ Please fill all fields');
      return;
    }

    try {
      const resCheck = await fetch(`/api/users/${encodeURIComponent(form.email)}`);
      const dataCheck = await resCheck.json();

      if (resCheck.ok && dataCheck.isApproved) {
        if (dataCheck.isApproved === 'pending') {
          setSubmitted(true);
          setMessage('⏳ Request already submitted. Please wait for admin approval.');
          return;
        } else if (dataCheck.isApproved === 'rejected') {
          setMessage('❌ Rejected by admin. You cannot proceed.');
          return;
        } else if (dataCheck.isApproved === 'approved') {
          const loginRes = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: form.email, password: form.password }),
          });

          const loginData = await loginRes.json();

          if (loginRes.ok && loginData.loginSuccess) {
            setMessage('✅ Approved and password verified. Redirecting...');
            setSubmitted(true);
            setTimeout(() => setIsApproved(true), 2000);
          } else {
            setMessage('❌ Incorrect password.');
          }

          return;
        }
      }
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isApproved: 'pending' }),
      });
      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setMessage('✅ Request sent to admin. Please wait for approval.');
      } else {
        setMessage(data.message || '❌ Something went wrong');
      }
    } catch (err) {
      console.error('Signup failed', err);
      setMessage('❌ Something went wrong');
    }
  };

  useEffect(() => {
    let interval;
    if (submitted && form.email) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/users/${encodeURIComponent(form.email)}`);
          const data = await res.json();
          if (data.isApproved === 'approved') {
            setMessage('✅ Approved. Please log in with correct password.');
            clearInterval(interval);
          } else if (data.isApproved === 'rejected') {
            setMessage('❌ Rejected by admin. You cannot proceed.');
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Error checking approval status:', err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [submitted, form.email]);

  if (isApproved) {
    return (
      <div className="center-screen">
        <div className="form-container">
          <h2>✅ You are approved and logged in!</h2>
          <p>Welcome to the next step of the application.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="center-screen">
      <div className="form-container">
        <div className="form-group">
          <label>First Name</label>
          <input
            value={form.firstName}
            onChange={e => setForm({ ...form, firstName: e.target.value })}
            placeholder="Enter First Name"
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            value={form.lastName}
            onChange={e => setForm({ ...form, lastName: e.target.value })}
            placeholder="Enter Last Name"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="Enter Email"
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Enter Password"
          />
        </div>
        <div className="button-group">
          <button type="submit" onClick={handleSubmit}>Sign Up</button>
        </div>
        {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
      </div>
    </div>
  );
}
