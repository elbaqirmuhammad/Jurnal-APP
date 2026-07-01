import { useState, useEffect } from 'react';
import {
  User, Users, Shield, Plus, Trash2, Pencil, CheckCircle, XCircle,
  BookOpen, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { Profile, ShowToast, TahunAjaran, Semester, MataPelajaran, UserRole, KelompokMapel } from '../types';

type AdminTab = 'users' | 'tahun' | 'semester' | 'kelas' | 'mapel' | 'murid';

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

  // Form states
  const [userForm, setUserForm] = useState({ nama_lengkap: '', nama_panggilan: '', nomor_whatsapp: '', role: 'ustaz' as UserRole, is_active: true });
  const [tahunForm, setTahunForm] = useState({ nama: '', aktif: false });
  const [semesterForm, setSemesterForm] = useState({ nama: '', aktif: false });
  const [kelasForm, setKelasForm] = useState({ nama_kelas: '', tingkat: '1', kode: '' });
  const [mapelForm, setMapelForm] = useState({ nama_mapel: '', kelompok: 'Diniyah' as KelompokMapel, kode: '' });
  const [newUserId, setNewUserId] = useState('');

  // Check if user is admin
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, tahunRes, semesterRes, kelasRes, mapelRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tahun_ajaran').select('*').order('nama'),
        supabase.from('semester').select('*').order('nama'),
        supabase.from('kelas').select('*').eq('is_active', true).order('nama_kelas'),
        supabase.from('mata_pelajaran').select('*').eq('is_active', true).order('nama_mapel'),
      ]);

      if (usersRes.data) setUsers(usersRes.data as Profile[]);
      if (tahunRes.data) setTahunList(tahunRes.data as TahunAjaran[]);
      if (semesterRes.data) setSemesterList(semesterRes.data as Semester[]);
      if (kelasRes.data) setKelasList(kelasRes.data);
      if (mapelRes.data) setMapelList(mapelRes.data as MataPelajaran[]);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setLoading(false);
  };

  // ========== USER MANAGEMENT ==========
  const openAddUser = () => {
    setEditingId(null);
    setNewUserId('');
    setUserForm({ nama_lengkap: '', nama_panggilan: '', nomor_whatsapp: '', role: 'ustaz', is_active: true });
    setShowModal(true);
  };

  const openEditUser = (u: Profile) => {
    setEditingId(u.id);
    setUserForm({
      nama_lengkap: u.nama_lengkap || '',
      nama_panggilan: u.nama_panggilan || '',
      nomor_whatsapp: u.nomor_whatsapp || '',
      role: (u.role || 'ustaz') as 'admin' | 'operator' | 'ustaz',
      is_active: u.is_active ?? true,
    });
    setShowModal(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('profiles').update({
          nama_lengkap: userForm.nama_lengkap,
          nama_panggilan: userForm.nama_panggilan,
          nomor_whatsapp: userForm.nomor_whatsapp,
          role: userForm.role,
          is_active: userForm.is_active,
        }).eq('id', editingId);
        if (error) throw error;
        showToast('User diperbarui!', 'success');
      } else {
        // New user - create auth user then profile
        if (!newUserId) {
          showToast('Masukkan ID Login untuk user baru', 'error');
          setSaving(false);
          return;
        }
        // Note: Actual auth user creation requires admin API (service role)
        showToast('Untuk membuat user baru, gunakan Admin API dengan service_role_key', 'error');
        setSaving(false);
        return;
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
    setSaving(false);
  };

  const toggleUserActive = async (u: Profile) => {
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    if (error) { showToast(error.message, 'error'); return; }
    setUsers(prev => prev.map(item => item.id === u.id ? { ...item, is_active: !u.is_active } : item));
    showToast(u.is_active ? 'User dinonaktifkan' : 'User diaktifkan', 'success');
  };

  // ========== TAHUN AJARAN ==========
  const openAddTahun = () => {
    setEditingId(null);
    setTahunForm({ nama: '', aktif: false });
    setShowModal(true);
  };

  const openEditTahun = (t: TahunAjaran) => {
    setEditingId(t.id);
    setTahunForm({ nama: t.nama, aktif: t.aktif || false });
    setShowModal(true);
  };

  const handleSaveTahun = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = editingId
      ? await supabase.from('tahun_ajaran').update(tahunForm).eq('id', editingId)
      : await supabase.from('tahun_ajaran').insert(tahunForm);
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
    setSemesterForm({ nama: s.nama, aktif: s.aktif || false });
    setShowModal(true);
  };

  const handleSaveSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = editingId
      ? await supabase.from('semester').update(semesterForm).eq('id', editingId)
      : await supabase.from('semester').insert(semesterForm);
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
    setEditingId(k.id?.toString() || null);
    setKelasForm({
      nama_kelas: k.nama_kelas,
      tingkat: k.tingkat?.toString() || '1',
      kode: k.kode || '',
    });
    setShowModal(true);
  };

  const handleSaveKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_kelas: kelasForm.nama_kelas,
      tingkat: kelasForm.tingkat,
      kode: kelasForm.kode || null,
      user_id: profile?.id,
    };
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
    setMapelForm({ nama_mapel: '', kelompok: 'Diniyah', kode: '' });
    setShowModal(true);
  };

  const openEditMapel = (m: MataPelajaran) => {
    setEditingId(m.id);
    setMapelForm({
      nama_mapel: m.nama_mapel,
      kelompok: m.kelompok || 'Diniyah',
      kode: m.kode || '',
    });
    setShowModal(true);
  };

  const handleSaveMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nama_mapel: mapelForm.nama_mapel,
      kelompok: mapelForm.kelompok,
      kode: mapelForm.kode || null,
      user_id: profile?.id,
    };
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
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">ID Login Baru</label>
              <input
                type="text"
                value={newUserId}
                onChange={e => setNewUserId(e.target.value)}
                className="input-field text-sm"
                placeholder="contoh: ustaz01"
              />
              <p className="text-[10px] text-amber-600 mt-1">Gunakan Admin API untuk membuat user baru</p>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Panggilan</label>
              <input
                type="text"
                value={userForm.nama_panggilan}
                onChange={e => setUserForm(p => ({ ...p, nama_panggilan: e.target.value }))}
                className="input-field text-sm"
                placeholder="Panggilan"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">No. WA</label>
              <input
                type="text"
                value={userForm.nomor_whatsapp}
                onChange={e => setUserForm(p => ({ ...p, nomor_whatsapp: e.target.value }))}
                className="input-field text-sm"
                placeholder="08xxx"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
              <select
                value={userForm.role}
                onChange={e => setUserForm(p => ({ ...p, role: e.target.value as any }))}
                className="input-field text-sm"
              >
                <option value="admin">Admin</option>
                <option value="operator">Operator</option>
                <option value="ustaz">Ustaz</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Status</label>
              <select
                value={userForm.is_active ? 'true' : 'false'}
                onChange={e => setUserForm(p => ({ ...p, is_active: e.target.value === 'true' }))}
                className="input-field text-sm"
              >
                <option value="true">Aktif</option>
                <option value="false">Non-aktif</option>
              </select>
            </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Kelas *</label>
              <input type="text" value={kelasForm.nama_kelas} onChange={e => setKelasForm(p => ({ ...p, nama_kelas: e.target.value }))} className="input-field text-sm" placeholder="1A" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tingkat</label>
              <select value={kelasForm.tingkat} onChange={e => setKelasForm(p => ({ ...p, tingkat: e.target.value }))} className="input-field text-sm">
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode</label>
            <input type="text" value={kelasForm.kode} onChange={e => setKelasForm(p => ({ ...p, kode: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nama Mapel *</label>
              <input type="text" value={mapelForm.nama_mapel} onChange={e => setMapelForm(p => ({ ...p, nama_mapel: e.target.value }))} className="input-field text-sm" placeholder="Fiqih" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kelompok</label>
              <select value={mapelForm.kelompok} onChange={e => setMapelForm(p => ({ ...p, kelompok: e.target.value as any }))} className="input-field text-sm">
                <option value="Diniyah">Diniyah</option>
                <option value="Umum">Umum</option>
                <option value="Bahasa">Bahasa</option>
                <option value="Tahfidz">Tahfidz</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kode</label>
            <input type="text" value={mapelForm.kode} onChange={e => setMapelForm(p => ({ ...p, kode: e.target.value }))} className="input-field text-sm" placeholder="Opsional" />
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
        <button onClick={getOpenAdd()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
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
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.id ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>{t.count}</span>
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
                    <p className="font-semibold text-slate-800 text-sm truncate">{u.nama_lengkap || 'User'}</p>
                    <div className="flex items-center gap-2">
                      <span className={`badge text-[10px] ${u.role === 'admin' ? 'badge-danger' : u.role === 'operator' ? 'badge-warning' : 'badge-success'}`}>{u.role}</span>
                      {u.nomor_whatsapp && <span className="text-xs text-slate-400">{u.nomor_whatsapp}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleUserActive(u)} className={`p-1.5 rounded-lg ${u.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}>
                      {u.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAHUN AJARAN */}
          {tab === 'tahun' && (
            tahunList.length === 0 ? <EmptyState title="Belum ada tahun ajaran" /> :
            <div className="space-y-2">
              {tahunList.map(t => (
                <div key={t.id} className="card p-3.5 flex items-center gap-3 group">
                  <div className={`w-3 h-3 rounded-full ${t.aktif ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-semibold text-slate-800 text-sm flex-1">{t.nama}</span>
                  {t.aktif && <span className="badge badge-success text-[10px]">Aktif</span>}
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
                  <div className={`w-3 h-3 rounded-full ${s.aktif ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="font-semibold text-slate-800 text-sm flex-1">{s.nama}</span>
                  {s.aktif && <span className="badge badge-success text-[10px]">Aktif</span>}
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
                    <span className="text-xs text-slate-400">Tingkat {k.tingkat}</span>
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
                    <span className={`badge text-[10px] ${m.kelompok === 'Diniyah' ? 'badge-success' : m.kelompok === 'Umum' ? 'badge-info' : 'badge-warning'}`}>{m.kelompok}</span>
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
