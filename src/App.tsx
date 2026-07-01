import { useState, useEffect, useRef } from 'react';
import { BookOpen, Loader2, Shield, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';
import type { ActiveTab, ShowToast, Profile } from './types';

import DashboardPage from './pages/DashboardPage';
import JadwalPage from './pages/JadwalPage';
import MuridPage from './pages/MuridPage';
import AbsensiPage from './pages/AbsensiPage';
import JurnalPage from './pages/JurnalPage';
import NilaiPage from './pages/NilaiPage';
import SikapPage from './pages/SikapPage';
import CatatanPage from './pages/CatatanPage';
import SoalPage from './pages/SoalPage';
import AgendaPage from './pages/AgendaPage';
import RaporPage from './pages/RaporPage';
import AdminPage from './pages/AdminPage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yunaztumwnmbyuxvdelz.supabase.co';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span className="text-sm font-medium">Memuat aplikasi...</span>
        </div>
      </div>
    </div>
  );
}

function SetupScreen({ showToast, onComplete }: { showToast: ShowToast; onComplete: () => void }) {
  const [idLogin, setIdLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLogin || !password) {
      showToast('Isi ID Login dan kata sandi', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Kata sandi minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);
    try {
      const email = `${idLogin.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.local`;

      // Call edge function to create admin
      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nama_lengkap: idLogin,
          role: 'admin',
          setup_key: 'simkbm-setup-2024',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal membuat admin');
      }

      showToast('Admin berhasil dibuat! Silakan login.', 'success');
      onComplete();
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Setup Awal</h1>
          <p className="text-slate-500 text-sm mt-1">Buat akun admin pertama</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-amber-200 p-6">
          <div className="bg-amber-50 rounded-xl p-3 mb-5 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Selamat datang! Ini adalah pengaturan pertama kali. Buat akun admin untuk mulai menggunakan aplikasi.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Login Admin</label>
              <input
                type="text"
                value={idLogin}
                onChange={e => setIdLogin(e.target.value)}
                className="input-field"
                placeholder="Contoh: admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Membuat...' : 'Buat Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ showToast }: { showToast: ShowToast }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [idLogin, setIdLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const friendlyError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'ID Login/Email atau kata sandi salah.';
    if (msg.includes('Email not confirmed')) return 'Email belum dikonfirmasi.';
    if (msg.includes('User already registered')) return 'ID Login sudah terdaftar.';
    if (msg.includes('Password should be')) return 'Kata sandi minimal 6 karakter.';
    if (msg.includes('unexpected_failure') || msg.includes('schema')) return 'Server database sedang gangguan, mohon coba lagi nanti.';
  if (msg.includes('500') || msg.includes('Internal Server Error')) return 'Terjadi kesalahan internal pada server autentikasi.';
    return msg;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idLogin || !password) {
      showToast('Isi ID Login/Email dan kata sandi', 'error');
      return;
    }

    setLoading(true);
    try {
      let email: string;

      // Check if input is already an email
      if (idLogin.includes('@')) {
        email = idLogin.toLowerCase().trim();
      } else {
        // Try to lookup real email from profiles table by id_login
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id_login', idLogin.toLowerCase().trim())
          .maybeSingle();

        if (profile?.email) {
          email = profile.email;
        } else {
          // Fallback: try id_login as email prefix with madrasah.local
          email = `${idLogin.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.local`;
        }
      }

      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showToast('Akun berhasil dibuat! Silakan login.', 'success');
        setMode('login');
      }
    } catch (err: any) {
      showToast(friendlyError(err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-200">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">SIM KBM Ustaz</h1>
          <p className="text-slate-500 text-sm mt-1">Manajemen Kelas & Santri</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
          <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'login' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${mode === 'register' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ID Login / Email</label>
              <input
                type="text"
                value={idLogin}
                onChange={e => setIdLogin(e.target.value)}
                className="input-field"
                placeholder="ID Login atau alamat email"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kata Sandi</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Memproses...' : mode === 'login' ? 'Masuk' : 'Buat Akun'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sistem Informasi Manajemen KBM Ustaz V2.0
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [tabHistory, setTabHistory] = useState<ActiveTab[]>([]);
  const backPressCount = useRef(0);
  const { toasts, showToast, removeToast } = useToast();

  // Fetch profile after auth
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // If no profile exists, create one with default ustaz role
    if (!data) {
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{ id: userId, role: 'ustaz', is_active: true }])
        .select()
        .maybeSingle();

      if (createError) {
        console.error('Error creating profile:', createError);
        return null;
      }
      return newProfile as Profile;
    }

    return data as Profile;
  };

  // Check if setup is needed (no users exist)
  const checkSetupNeeded = async (): Promise<boolean> => {
    try {
      // Check via Supabase client with anon access
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      // If we get an error about RLS or no rows, setup might be needed
      if (error) {
        // Permission denied means RLS is blocking - could be no user context
        // This is expected when there's no logged-in user and anon can't read
        // Since we added anon_read_profiles policy, this should work
        return true;
      }

      return (!data || data.length === 0);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          setProfile(p);
          setNeedsSetup(false);
        } else {
          // Check if setup is needed
          const setupNeeded = await checkSetupNeeded();
          setNeedsSetup(setupNeeded);
        }
      } catch {
        setUser(null);
        setProfile(null);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        setProfile(p);
        setNeedsSetup(false);
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Track tab changes for back navigation
  const handleTabChange = (tab: ActiveTab) => {
    setTabHistory(prev => [...prev, activeTab]);
    setActiveTab(tab);
  };

  // Handle Android back button
  useEffect(() => {
    const handleBack = (e: PopStateEvent) => {
      e.preventDefault();
      if (activeTab !== 'dashboard') {
        const prev = tabHistory[tabHistory.length - 1] ?? 'dashboard';
        setTabHistory(prev => prev.slice(0, -1));
        setActiveTab(prev);
        window.history.pushState(null, '', window.location.pathname);
        backPressCount.current = 0;
      } else {
        const next = backPressCount.current + 1;
        backPressCount.current = next;
        if (next >= 2) {
          showToast('Menutup aplikasi...', 'info');
          window.history.back();
        } else {
          showToast('Tekan sekali lagi untuk keluar', 'info');
          setTimeout(() => { backPressCount.current = 0; }, 2000);
        }
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handleBack);
    return () => window.removeEventListener('popstate', handleBack);
  }, [activeTab, tabHistory, showToast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (authLoading) return <LoadingScreen />;

  if (needsSetup) {
    return (
      <>
        <SetupScreen
          showToast={showToast}
          onComplete={() => setNeedsSetup(false)}
        />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen showToast={showToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardPage showToast={showToast} profile={profile} />;
      case 'jadwal':    return <JadwalPage showToast={showToast} />;
      case 'murid':     return <MuridPage showToast={showToast} />;
      case 'absensi':   return <AbsensiPage showToast={showToast} />;
      case 'jurnal':    return <JurnalPage showToast={showToast} />;
      case 'nilai':     return <NilaiPage showToast={showToast} />;
      case 'sikap':     return <SikapPage showToast={showToast} />;
      case 'catatan':   return <CatatanPage showToast={showToast} />;
      case 'soal':      return <SoalPage showToast={showToast} />;
      case 'agenda':    return <AgendaPage showToast={showToast} />;
      case 'rapor':     return <RaporPage showToast={showToast} profile={profile} />;
      case 'admin':     return <AdminPage showToast={showToast} profile={profile} />;
      default:         return null;
    }
  };

  return (
    <>
      <Layout
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        profile={profile}
        onLogout={handleLogout}
      >
        {renderPage()}
      </Layout>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}
