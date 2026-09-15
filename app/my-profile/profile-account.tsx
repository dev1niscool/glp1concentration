'use client';

import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { loadCloudProfile, profileCloudClient, saveCloudProfile, type CloudProfile } from '../profile-cloud';
import { profileSummary, type InjectionProfile } from '../profile-data';
import { profileAuthIdentifier, profileUsername } from '../profile-username';

export function ProfileAccount({ profile, onLoad }: { profile: InjectionProfile; onLoad: (profile: InjectionProfile) => void }) {
  const [client] = useState(profileCloudClient);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [action, setAction] = useState<'signin' | 'signup'>('signin');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState<CloudProfile | null>(null);
  const [review, setReview] = useState(false);
  const accountGeneration = useRef(0);
  const userId = useRef<string | null>(null);

  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      const nextId = session?.user.id ?? null;
      if (userId.current !== nextId) { accountGeneration.current += 1; setCloud(null); setReview(false); }
      userId.current = nextId;
      setUser(session?.user ?? null);
    });
    return () => { subscription.unsubscribe(); accountGeneration.current += 1; };
  }, [client]);

  async function authenticate(event: React.FormEvent) {
    event.preventDefault();
    if (!client) return;
    setBusy(true); setNotice('');
    try {
      const email = profileAuthIdentifier(username);
      const response = action === 'signup' ? await client.auth.signUp({ email, password,
        options: { data: { username: profileUsername(username) } } })
        : await client.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      setPassword('');
      if (action === 'signup' && !response.data.session) throw new Error('Account registration could not finish. Please try signing in or use a different username.');
      setNotice(action === 'signup' ? 'Account created. Save the profile shown here to your account.' : 'Signed in. Load your account profile, or save the profile shown here.');
      setAction('signin');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Sign-in could not finish. Try again.';
      setNotice(message === 'User already registered' ? 'That username is already taken. Sign in or choose another username.'
        : message === 'Invalid login credentials' ? 'Username or password is incorrect.' : message);
    }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!client) return;
    setBusy(true);
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      setNotice('Signed out. This browser still holds its local profile.');
    } catch { setNotice('Sign-out could not finish. Please try again.'); }
    finally { setBusy(false); }
  }

  async function fetchCloud() {
    if (!client || !user) return;
    const generation = accountGeneration.current;
    setBusy(true); setNotice('');
    try {
      const next = await loadCloudProfile(client);
      if (generation !== accountGeneration.current) return;
      setCloud(next);
      if (next.revision === 0) setNotice('No history saved to this account yet. You can save the profile shown here.');
      else { setReview(true); setNotice('Account profile loaded for review.'); }
    } catch (cause) { if (generation === accountGeneration.current) setNotice(cause instanceof Error ? cause.message : 'Could not load the account profile.'); }
    finally { setBusy(false); }
  }

  async function saveCloud() {
    if (!client || !user) return;
    const generation = accountGeneration.current;
    setBusy(true); setNotice('');
    try {
      // Load the revision before the first save. Existing records require review,
      // preventing a new device's empty local copy from erasing account history.
      let current = cloud;
      if (!current) {
        current = await loadCloudProfile(client);
        if (generation !== accountGeneration.current) return;
        setCloud(current);
        if (current.revision > 0) { setReview(true); setNotice('Your account already has a profile. Review it before saving changes from this device.'); return; }
      }
      const saved = await saveCloudProfile(client, profile, current.revision, user.id);
      if (generation !== accountGeneration.current) return;
      setCloud(saved); setReview(false); setNotice('Saved to your account. Sign in on another device and load this profile.');
    } catch (cause) { if (generation === accountGeneration.current) setNotice(cause instanceof Error ? cause.message : 'Could not save the account profile.'); }
    finally { setBusy(false); }
  }

  if (!client) return <section className="profile-tool-card"><h2>Account sync</h2><p>Account sync is not connected yet. Your profile is saved in this browser, and import/export works between devices.</p></section>;

  return (
    <section className="profile-tool-card profile-account"><h2>Save across devices</h2>
      <p>Use the same username and password on each device to save and load your injection history.</p>
      {user ? <>
        <p className="profile-account-email">Signed in as <strong>{user.email?.split('@')[0]}</strong></p>
        <div className="button-row"><button type="button" className="primary" disabled={busy || review} onClick={() => void saveCloud()}>Save to account</button>
          <button type="button" className="reset-button" disabled={busy} onClick={() => void fetchCloud()}>Load account profile</button></div>
        <p className="profile-note">Edits save in this browser immediately. Use “Save to account” after editing to make them available on other devices.</p>
        {review && cloud && <div className="profile-import-review">
          <strong>Account copy: {profileSummary(cloud.blocks).count} injections in {cloud.blocks.length} blocks.</strong>
          <p>Load this account copy into the editor, or keep the browser copy and save it to replace the account version. Export a backup first if you want to retain both.</p>
          <div className="button-row"><button type="button" className="primary" onClick={() => { onLoad(cloud); setReview(false); setNotice('Account profile copied into the editor.'); }}>Use account copy</button>
            <button type="button" className="reset-button" onClick={() => { setReview(false); setNotice('Browser copy kept. Choose Save to account to upload it.'); }}>Keep browser copy</button></div>
        </div>}
        <button type="button" className="reset-button" disabled={busy} onClick={() => void signOut()}>Sign out</button>
        <p className="profile-note">Signing out leaves the browser copy in place. Remove its dose blocks or clear site data on a shared device.</p>
      </> : <form onSubmit={authenticate}>
        <label>Username<input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z0-9_]{3,32}" aria-describedby="username-help" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <p id="username-help" className="profile-note">3–32 letters, numbers, or underscores. Uppercase and lowercase count as the same username.</p>
        <label>Password<input type="password" required minLength={action === 'signin' ? 1 : 12} maxLength={128} autoComplete={action === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {action !== 'signin' && <p className="profile-note">Use at least 12 characters. Passwords are handled by Supabase Auth and never included in profile exports.</p>}
        <div className="button-row"><button type="submit" className="primary" disabled={busy}>{action === 'signup' ? 'Create account' : 'Sign in'}</button>
          <button type="button" className="reset-button" disabled={busy} onClick={() => { setAction(action === 'signin' ? 'signup' : 'signin'); setNotice(''); }}>{action === 'signin' ? 'Create an account' : 'Back to sign in'}</button></div>
      </form>}
      <p className="profile-note"><strong>No email or password recovery.</strong> Keep your username and password somewhere secure and export backups. A forgotten password cannot be reset through this site.</p>
      {notice && <p role="status" className="profile-account-notice">{notice}</p>}
    </section>
  );
}
