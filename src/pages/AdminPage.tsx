import { useState, useEffect } from 'react';
import {
  User, Users, Shield, Plus, Trash2, Pencil,
  BookOpen, Calendar, Type, Save, Key, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { Profile, ShowToast, TahunAjaran, Semester, MataPelajaran, UserRole, KelompokMapel } from '../types';

type AdminTab = 'users' | 'info' | 'tahun' | 'semester' | 'kelas' | 'mapel';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yunaztumwnmbyuxvdelz.supabase.co';

export default function AdminPage({
  showToast,
  profile
}: {
  showToast: ShowToast;
  profile: Profile | null;
}) {
  const [tab, setTab] = useState<AdminTab>('users');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Data states
  const [users, setUsers] = useState<Profile[]>([]);
  const [tahunList, setTahunList] = useState<TahunAjaran[]>([]);
  const [semesterList, setSemesterList] = useState<Semester[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<MataPelajaran[]>([]);
  const [runningText, setRunningText] = useState('');

  // Form states
  const [userForm, setUserForm] = useState({
    nama_lengkap: '',
    nama_panggilan: '',
    nomor_whatsapp: '',
    role: 'Guru' as UserRole,
    is_active: true,
    password: ''
  });
  const [tahunForm, setTahunForm] = useState({ nama: '', aktif: false });
  const [semesterForm, setSemesterForm] = useState({ nama: '', aktif: false });
  const [kelasForm, setKelasForm] = useState({ nama_kelas: '', tingkat: '1', kode: '' });
  const [mapelForm, setMapelForm] = useState({ nama_mapel: '', kelompok: 'A' as KelompokMapel, kode: '' });
  const [newUserId, setNewUserId] = useState('');

  const isAdmin = profile?.role === 'Admin';

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, tahunRes, semesterRes, kelasRes, mapelRes, infoRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tahun_ajaran').select('*').order('tahun_ajaran'),
        supabase.from('semester').select('*').order('nama_semester'),
        supabase.from('kelas').select('*').order('nama_kelas'),
        supabase.from('mata_pelajaran').select('*').order('nama_mapel'),
        supabase.from('pengaturan').select('*').eq('kunci', 'running_text_global').maybeSingle(),
      ]);

      if (usersRes.data) setUsers(usersRes.data as Profile[]);
      if (tahunRes.data) setTahunList(tahunRes.data as TahunAjaran[]);
      if (semesterRes.data) setSemesterList(semesterRes.data as Semester[]);
      if (kelasRes.data) setKelasList(kelasRes.data);
      if (mapelRes.data) setMapelList(mapelRes.data as MataPelajaran[]);
      if (infoRes.data?.nilai) setRunningText(infoRes.data.nilai);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setLoading(false);
  };

  // ========== USER MANAGEMENT ==========
  const openAddUser = () => {
    setEditingId(null);
    setNewUserId('');
    setUserForm({
      nama_lengkap: '',
      nama_panggilan: '',
      nomor_whatsapp: '',
      role: 'Guru',
      is_active: true,
      password: ''
    });
    setShowModal(true);
  };

  const openEditUser = (u: Profile) => {
    setEditingId(u.id);
    setNewUserId('');
    setUserForm({
      nama_lengkap: u.nama || '',
      nama_panggilan: '',
      nomor_whatsapp: '',
      role: (u.role || 'Guru') as UserRole,
      is_active: true,
      password: ''
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        // Update existing user
        const { error } = await supabase.from('profiles').update({
          nama: userForm.nama_lengkap,
          role: userForm.role,
        }).eq('id', editingId);
        if (error) throw error;
        showToast('User diperbarui!', 'success');
      } else {
        // Create new user via edge function
        if (!newUserId) {
          showToast('Masukkan ID Login untuk user baru', 'error');
          setSaving(false);
          return;
        }
        if (!userForm.password || userForm.password.length < 6) {
          showToast('Password minimal 6 karakter', 'error');
          setSaving(false);
          return;
        }

        const email = `${newUserId.toLowerCase().replace(/[^a-z0-9]/g, '')}@madrasah.local`;

        const response = await fetch(`${SUPABASE_URL}/functions/v1/create-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password: userForm.password,
            nama_lengkap: userForm.nama_lengkap,
            role: userForm.role.toLowerCase() === 'admin' ? 'admin' : 'Guru',
            setup_key: 'simkbm-setup-2024',
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Gagal membuat user');
        }

        showToast('User berhasil dibuat!', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Terjadi kesalahan', 'error');
    }
    setSaving(false);
  };

  const handleResetPassword = async (u: Profile) => {
    // Use edge function to reset password
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: u.id,
          new_password: '123456',
          setup_key: 'simkbm-setup-2024',
        }),
      });

      // If the edge function doesn't exist, show alternative method
      if (!response.ok) {
        showToast(`Reset password: Gunakan Admin API. Password default: 123456`, 'info');
        return;
      }

      showToast('Password berhasil direset ke: 123456', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // ========== RUNNING TEXT ==========
  const handleSaveRunningText = async () => {
    setSaving(true);
    try {
      // Check if running_text_global exists
      const { data: existing } = await supabase
        .from('pengaturan')
        .select('id')
        .eq('kunci', 'running_text_global')
        .maybeSingle();

      let error;
      if (existing?.id) {
        ({ error } = await supabase
          .from('pengaturan')
          .update({ nilai: runningText })
          .eq('id', existing.id));
      } else {
        ({ error } = await supabase
          .from('pengaturan')
          .insert({ kunci: 'running_text_global', nilai: runningText }));
      }

      if (error) throw error;
      showToast('Teks berjalan berhasil disimpan!', 'success');
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  // ========== TAHUN AJARAN ==========
  const openAddTahun = () => {
    setEditingId(null);
    setTahunForm({ nama: '', aktif: false });
    setShowModal(true);
  };

  const openEditTahun = (t: TahunAjaran) => {
    setEditingId(t.id);
    setTahunForm({ nama: t.tahun_ajaran, aktif: t.is_active || false });
    setShowModal(true);
  };

  const handleSaveTahun = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { tahun_ajaran: tahunForm.nama, is_active: tahunForm.aktif };
    const { error } = editingId
      ? await supabase.from('tahun_ajaran').update(payload).eq('id', editingId)
      : await supabase.from('tahun_ajaran').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
    setShowModal(false);
    fetchData();
  };

  // ========== SEMESTER ==========
  const openAddSemester = () => {
    setEditingId(null);
    setSemesterForm({ nama: '', aktif: false });
    setShowModal(true);
  };

  const openEditSemester = (s: Semester) => {
    setEditingId(s.id);
    setSemesterForm({ nama: s.nama_semester, aktif: s.is_active || false });
    setShowModal(true);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { nama_semester: semesterForm.nama, is_active: semesterForm.aktif };
    const { error } = editingId
      ? await supabase.from('semester').update(payload).eq('id', editingId)
      : await supabase.from('semester').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
    setShowModal(false);
    fetchData();
  };

  // ========== KELAS ==========
  const openAddKelas = () => {
    setEditingId(null);
    setKelasForm({ nama_kelas: '', tingkat: '1', kode: '' });
    setShowModal(true);
  };

  const openEditKelas = (k: any) => {
    setEditingId(k.id);
    setKelasForm({
      nama_kelas: k.nama_kelas,
      tingkat: '1',
      kode: k.kode || '',
    });
    setShowModal(true);
  };

  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { nama_kelas: kelasForm.nama_kelas };
    let error;
    if (editingId) {
      ({ error } = await supabase.from('kelas').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('kelas').insert(payload));
    }
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
    setShowModal(false);
    fetchData();
  };

  // ========== MAPEL ==========
  const openAddMapel = () => {
    setEditingId(null);
    setMapelForm({ nama_mapel: '', kelompok: 'A', kode: '' });
    setShowModal(true);
  };

  const openEditMapel = (m: MataPelajaran) => {
    setEditingId(m.id);
    setMapelForm({
      nama_mapel: m.nama_mapel,
      kelompok: m.kelompok || 'A',
      kode: '',
    });
    setShowModal(true);
  };

  const handleSaveMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { nama_mapel: mapelForm.nama_mapel, kelompok: mapelForm.kelompok };
    const { error } = editingId
      ? await supabase.from('mata_pelajaran').update(payload).eq('id', editingId)
      : await supabase.from('mata_pelajaran').insert(payload);
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(editingId ? 'Diperbarui!' : 'Ditambahkan!', 'success');
    setShowModal(false);
    fetchData();
  };

  const handleDeleteMapel = async (id: string) => {
    const { error } = await supabase.from('mata_pelajaran').delete().eq('id', id);
    if (error) { showToast(error.message, 'error'); return; }
    setMapelList(prev => prev.filter(m => m.id !== id));
    showToast('Dihapus', 'info');
  };

  // ========== RENDER ==========
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'users' as AdminTab, label: 'User', count: users.length, icon: Users },
    { id: 'info' as AdminTab, label: 'Info', count: 0, icon: Type },
    { id: 'tahun' as AdminTab, label: 'Tahun Ajaran', count: tahunList.length, icon: Calendar },
    { id: 'semester' as AdminTab, label: 'Semester', count: semesterList.length, icon: BookOpen },
    { id: 'kelas' as AdminTab, label: 'Kelas', count: kelasList.length, icon: BookOpen },
    { id: 'mapel' as AdminTab, label: 'Mapel', count: mapelList.length, icon: BookOpen },
  ];

  const renderModalContent = () => {
    if (tab === 'users') {
      return (
        <form onSubmit={handleSaveUser} className="space-y-4">
          {!editingId && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ID Login Baru *</label>
              <input
                type="text"
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                className="input-field text-sm"
                placeholder="contoh: ustaz01"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              value={userForm.nama_lengkap}
              onChange={e => setUserForm(p => ({ ...p, nama_lengkap: e.target.value }))}
              className="input-field text-sm"
              placeholder="Nama lengkap"
              required
            />
          </div>
          {!editingId && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password Awal *</label>
              <input
                type="password"
                value={userForm.password}
                onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
                className="input-field text-sm"
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
            <select
              value={userForm.role}
              onChange={e => setUserForm(p => ({ ...p, role: e.target.value as UserRole }))}
              className="input-field text-sm"
            >
              <option value="Guru">Guru / Ustaz</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }

    if (tab === 'tahun') {
      return (
        <form onSubmit={handleSaveTahun} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Tahun Ajaran</label>
            <input type="text" value={tahunForm.nama} onChange={e => setTahunForm(p => ({ ...p, nama: e.target.value }))} className="input-field text-sm" placeholder="2024/2025" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="aktif" checked={tahunForm.aktif} onChange={e => setTahunForm(p => ({ ...p, aktif: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="aktif" className="text-sm text-slate-600">Tahun ajaran aktif</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }

    if (tab === 'semester') {
      return (
        <form onSubmit={handleSaveSemester} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Semester</label>
            <input type="text" value={semesterForm.nama} onChange={e => setSemesterForm(p => ({ ...p, nama: e.target.value }))} className="input-field text-sm" placeholder="Ganjil" required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="aktif" checked={semesterForm.aktif} onChange={e => setSemesterForm(p => ({ ...p, aktif: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
            <label htmlFor="aktif" className="text-sm text-slate-600">Semester aktif</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }

    if (tab === 'kelas') {
      return (
        <form onSubmit={handleSaveKelas} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Kelas *</label>
            <input type="text" value={kelasForm.nama_kelas} onChange={e => setKelasForm(p => ({ ...p, nama_kelas: e.target.value }))} className="input-field text-sm" placeholder="1A" required />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }

    if (tab === 'mapel') {
      return (
        <form onSubmit={handleSaveMapel} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Mapel *</label>
            <input type="text" value={mapelForm.nama_mapel} onChange={e => setMapelForm(p => ({ ...p, nama_mapel: e.target.value }))} className="input-field text-sm" placeholder="Fiqih" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelompok</label>
            <select value={mapelForm.kelompok} onChange={e => setMapelForm(p => ({ ...p, kelompok: e.target.value as KelompokMapel }))} className="input-field text-sm">
              <option value="A">Kelompok A (Wajib)</option>
              <option value="B">Kelompok B</option>
              <option value="C">Kelompok C</option>
              <option value="Wajib">Wajib</option>
              <option value="Pilihan">Pilihan</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      );
    }

    return null;
  };

  const getOpenAdd = () => {
    switch (tab) {
      case 'users': return openAddUser;
      case 'tahun': return openAddTahun;
      case 'semester': return openAddSemester;
      case 'kelas': return openAddKelas;
      case 'mapel': return openAddMapel;
      default: return openAddUser;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Admin Panel</h2>
          <p className="section-subtitle">Kelola data master sistem</p>
        </div>
        {tab !== 'info' && (
          <button onClick={getOpenAdd()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${tab === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card p-4 animate-pulse h-16 bg-slate-50 rounded-2xl" />)}</div>
      ) : (
        <>
          {/* USERS */}
          {tab === 'users' && (
            users.length === 0 ? <EmptyState title="Belum ada user" description="Tambahkan user untuk mulai." icon={<Users className="w-8 h-8 text-slate-300" />} /> :
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{u.nama || 'User'}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`badge text-[10px] ${u.role === 'Admin' ? 'badge-danger' : 'badge-success'}`}>{u.role}</span>
                      {u.email && <span className="text-xs text-slate-400 truncate">{u.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Reset password ke 123456"
                    >
                      <Key className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RUNNING TEXT / INFO */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                  <Type className="w-4 h-4 text-emerald-500" />
                  Teks Berjalan Global
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  Teks ini akan ditampilkan sebagai running text di bagian atas aplikasi.
                </p>
                <textarea
                  value={runningText}
                  onChange={e => setRunningText(e.target.value)}
                  className="input-field text-sm resize-none"
                  rows={4}
                  placeholder="Contoh: Selamat datang di SIM KBM Ustaz. Jangan lupa sholat berjamaah..."
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSaveRunningText}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Teks'}
                  </button>
                </div>
              </div>

              <div className="card p-5 bg-amber-50 border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm mb-1">Informasi Reset Password</h4>
                    <p className="text-xs text-amber-700">
                      Untuk reset password user, klik tombol kunci pada daftar user. Password akan direset menjadi "123456".
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAHUN AJARAN */}
          {tab === 'tahun' && (
            tahunList.length === 0 ? <EmptyState title="Belum ada tahun ajaran" /> :
            <div className="space-y-2">
              {tahunList.map(t => (
                <div key={t.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className={`w-3 h-3 rounded-full ${t.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-semibold text-slate-800 text-sm flex-1">{t.tahun_ajaran}</span>
                  {t.is_active && <span className="badge badge-success text-[10px]">Aktif</span>}
                  <button onClick={() => openEditTahun(t)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* SEMESTER */}
          {tab === 'semester' && (
            semesterList.length === 0 ? <EmptyState title="Belum ada semester" /> :
            <div className="space-y-2">
              {semesterList.map(s => (
                <div key={s.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className={`w-3 h-3 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-semibold text-slate-800 text-sm flex-1">{s.nama_semester}</span>
                  {s.is_active && <span className="badge badge-success text-[10px]">Aktif</span>}
                  <button onClick={() => openEditSemester(s)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* KELAS */}
          {tab === 'kelas' && (
            kelasList.length === 0 ? <EmptyState title="Belum ada kelas" /> :
            <div className="space-y-2">
              {kelasList.map(k => (
                <div key={k.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{k.nama_kelas}</p>
                  </div>
                  <button onClick={() => openEditKelas(k)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* MAPEL */}
          {tab === 'mapel' && (
            mapelList.length === 0 ? <EmptyState title="Belum ada mata pelajaran" /> :
            <div className="space-y-2">
              {mapelList.map(m => (
                <div key={m.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{m.nama_mapel}</p>
                    <span className={`badge text-[10px] ${m.kelompok === 'A' || m.kelompok === 'Wajib' ? 'badge-success' : 'badge-info'}`}>{m.kelompok}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => openEditMapel(m)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteMapel(m.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); }}
        title={editingId ? 'Edit' : 'Tambah'}
        size="sm"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
