'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { DoseBlockCard, defaultDoseBlocks } from '../dose-block-card';
import { SiteFooter, SiteHeader } from '../site-chrome';
import type { CalendarDoseBlock } from '../pk';
import { parseProfile, PROFILE_MAX_BYTES, profileSummary, readLocalProfile, serializeProfile, writeLocalProfile, type InjectionProfile } from '../profile-data';
import { ProfileAccount } from './profile-account';

export function ProfileClient() {
  const [profile, setProfile] = useState<InjectionProfile>({ blocks: defaultDoseBlocks(), updatedAt: '' });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('Loading your saved profile…');
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState<InjectionProfile | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const importRun = useRef(0);
  const summary = profileSummary(profile.blocks);
  const dateCount = profile.blocks.reduce((count, block) => count + block.dates.length, 0);

  useEffect(() => {
    try {
      const saved = readLocalProfile(window.localStorage);
      // Hydrate an external browser store after SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setProfile(saved);
      setStatus(saved ? 'Profile restored from this browser.' : 'Your changes save automatically in this browser.');
    } catch {
      setError('The saved profile could not be read. You can still edit and export a copy.');
    }
    setReady(true);
    return () => { importRun.current += 1; };
  }, []);

  function replaceProfile(next: InjectionProfile) {
    setProfile(next);
    setError('');
    try {
      writeLocalProfile(window.localStorage, next);
      setStatus('Profile saved in this browser.');
    } catch {
      setStatus('Changes are in this tab only.');
      setError('Browser storage is unavailable or full. Export a copy before leaving this page.');
    }
  }

  function updateBlocks(blocks: CalendarDoseBlock[]) {
    replaceProfile({ blocks, updatedAt: new Date().toISOString() });
  }

  function exportProfile() {
    try {
      const text = serializeProfile(profile);
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `glp1-profile-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError('');
      setStatus('Profile exported. Keep the file somewhere private.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The profile could not be exported.');
    }
  }

  async function importProfile(file?: File) {
    if (!file) return;
    const run = ++importRun.current;
    setPendingImport(null);
    setError('');
    try {
      if (file.size > PROFILE_MAX_BYTES) throw new Error('Profile files must be smaller than 100 KB.');
      const next = parseProfile(await file.text());
      if (run === importRun.current) setPendingImport(next);
    } catch (cause) {
      if (run === importRun.current) setError(cause instanceof Error ? cause.message : 'The profile file could not be read.');
    }
  }

  return (
    <main className="site-shell profile-page">
      <SiteHeader active="my-profile" />
      <section className="profile-heading"><p className="eyebrow">My Profile</p><h1>Your injection history.</h1>
        <p>Choose a dose once, then add every date you took it. Update your blocks as your history grows.</p>
      </section>
      <div className="profile-layout">
        <section className="profile-editor" aria-labelledby="profile-doses-title">
          <div className="profile-section-heading"><h2 id="profile-doses-title">Dates &amp; doses</h2><span>{summary.count} {summary.count === 1 ? 'injection' : 'injections'} · {profile.blocks.length} {profile.blocks.length === 1 ? 'block' : 'blocks'}</span></div>
          <p className="profile-status" role="status">{status}</p>
          {error && <p className="calendar-error" role="alert">{error}</p>}
          <fieldset disabled={!ready} className="profile-fields">
            <div className="profile-dose-grid">{profile.blocks.map((block, index) => <DoseBlockCard key={block.id} block={block} index={index}
              removable canAddDate={dateCount < 100}
              onChange={(next) => updateBlocks(profile.blocks.map((item) => item.id === block.id ? next : item))}
              onRemove={() => updateBlocks(profile.blocks.filter((item) => item.id !== block.id))} />)}</div>
            {!profile.blocks.length && <p>No injections recorded yet. Add a dose block to begin.</p>}
            <button className="add-button" type="button" disabled={dateCount >= 100} onClick={() => updateBlocks([...profile.blocks, {
              ...(profile.blocks.at(-1) ?? defaultDoseBlocks()[0]), id: Math.max(0, ...profile.blocks.map((block) => block.id)) + 1, dates: [''],
            }])}>+ Add dose block</button>
          </fieldset>
          <p className="profile-note">Up to 100 dates. Each block shares its medication, dose, and time of day.</p>
        </section>
        <aside className="profile-tools">
          {ready && <ProfileAccount profile={profile} onLoad={replaceProfile} />}
          <section className="profile-tool-card"><h2>Use your history</h2>
            <p>Open Variable injection dates and choose “Load from My Profile” to copy this history into the graph. Changes to the graph stay separate from your profile.</p>
            <Link className="profile-link" href="/custom-intervals">Open Variable injection dates ↗</Link>
          </section>
          <section className="profile-tool-card"><h2>Import &amp; export</h2>
            <p>Export a JSON backup, or import a file previously exported from this site. Files contain your medication history; keep them private.</p>
            <div className="button-row"><button className="primary" type="button" disabled={!ready} onClick={exportProfile}>Export profile</button>
              <button className="reset-button" type="button" disabled={!ready} onClick={() => fileInput.current?.click()}>Import profile</button></div>
            <input className="sr-only" ref={fileInput} type="file" accept=".json,application/json" aria-label="Import a profile JSON file"
              onChange={(event) => { void importProfile(event.target.files?.[0]); event.target.value = ''; }} />
            {pendingImport && <div className="profile-import-review" role="status">
              <strong>Ready to import {profileSummary(pendingImport.blocks).count} injections in {pendingImport.blocks.length} dose blocks.</strong>
              <p>This replaces the profile shown here. Export your current profile first if you want to keep a backup.</p>
              <div className="button-row"><button type="button" className="primary" onClick={() => {
                replaceProfile({ ...pendingImport, updatedAt: new Date().toISOString() }); setPendingImport(null);
              }}>Replace with imported profile</button><button type="button" className="reset-button" onClick={() => setPendingImport(null)}>Cancel</button></div>
            </div>}
          </section>
          <section className="profile-tool-card"><h2>Saved on this device</h2>
            <p>Your profile stays in this browser across refreshes. Clearing site data removes it. Anyone using the same browser profile can see these entries.</p>
            <p>Import and export also let you move your history between browsers and devices.</p>
          </section>
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}
