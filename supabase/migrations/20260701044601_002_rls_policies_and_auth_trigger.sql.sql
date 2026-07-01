-- Auth trigger to create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'Guru'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles table
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Allow anon to read profiles for login lookup (by email)
CREATE POLICY "select_profile_by_email" ON profiles FOR SELECT
  TO anon USING (email IS NOT NULL);

-- RLS Policies for pengaturan table
CREATE POLICY "select_pengaturan" ON pengaturan FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_pengaturan" ON pengaturan FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_pengaturan" ON pengaturan FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_pengaturan" ON pengaturan FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for kelas table
CREATE POLICY "select_kelas" ON kelas FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_kelas" ON kelas FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_kelas" ON kelas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_kelas" ON kelas FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for mata_pelajaran table
CREATE POLICY "select_mapel" ON mata_pelajaran FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_mapel" ON mata_pelajaran FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_mapel" ON mata_pelajaran FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_mapel" ON mata_pelajaran FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for jadwal table
CREATE POLICY "select_jadwal" ON jadwal FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_jadwal" ON jadwal FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_jadwal" ON jadwal FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_jadwal" ON jadwal FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for tahun_ajaran table
CREATE POLICY "select_tahun_ajaran" ON tahun_ajaran FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_tahun_ajaran" ON tahun_ajaran FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_tahun_ajaran" ON tahun_ajaran FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_tahun_ajaran" ON tahun_ajaran FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for semester table
CREATE POLICY "select_semester" ON semester FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_semester" ON semester FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_semester" ON semester FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_semester" ON semester FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for sikap table (user-based)
CREATE POLICY "select_own_sikap" ON sikap FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_own_sikap" ON sikap FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_sikap" ON sikap FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_own_sikap" ON sikap FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for penilaian table
CREATE POLICY "select_penilaian" ON penilaian FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_penilaian" ON penilaian FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_penilaian" ON penilaian FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_penilaian" ON penilaian FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for detail_nilai table
CREATE POLICY "select_detail_nilai" ON detail_nilai FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_detail_nilai" ON detail_nilai FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_detail_nilai" ON detail_nilai FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_detail_nilai" ON detail_nilai FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for jurnal_kbm table
CREATE POLICY "select_jurnal_kbm" ON jurnal_kbm FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_jurnal_kbm" ON jurnal_kbm FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_jurnal_kbm" ON jurnal_kbm FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_jurnal_kbm" ON jurnal_kbm FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for catatan_guru table
CREATE POLICY "select_catatan_guru" ON catatan_guru FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_catatan_guru" ON catatan_guru FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_catatan_guru" ON catatan_guru FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_catatan_guru" ON catatan_guru FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for presensi_guru table
CREATE POLICY "select_presensi_guru" ON presensi_guru FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_presensi_guru" ON presensi_guru FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_presensi_guru" ON presensi_guru FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_presensi_guru" ON presensi_guru FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for pengumuman table
CREATE POLICY "select_pengumuman" ON pengumuman FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_pengumuman" ON pengumuman FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_pengumuman" ON pengumuman FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_pengumuman" ON pengumuman FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for notifikasi table
CREATE POLICY "select_notifikasi" ON notifikasi FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_notifikasi" ON notifikasi FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_notifikasi" ON notifikasi FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_notifikasi" ON notifikasi FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for log_aktivitas table
CREATE POLICY "select_log_aktivitas" ON log_aktivitas FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_log_aktivitas" ON log_aktivitas FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_log_aktivitas" ON log_aktivitas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_log_aktivitas" ON log_aktivitas FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for agenda table
CREATE POLICY "select_agenda" ON agenda FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_agenda" ON agenda FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_agenda" ON agenda FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_agenda" ON agenda FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for rapor_final table
CREATE POLICY "select_rapor_final" ON rapor_final FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_rapor_final" ON rapor_final FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_rapor_final" ON rapor_final FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_rapor_final" ON rapor_final FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for soal table
CREATE POLICY "select_soal" ON soal FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_soal" ON soal FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_soal" ON soal FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_soal" ON soal FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for materi table
CREATE POLICY "select_materi" ON materi FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_materi" ON materi FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_materi" ON materi FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_materi" ON materi FOR DELETE
  TO authenticated USING (true);

-- RLS Policies for log_perubahan_nilai table
CREATE POLICY "select_log_perubahan_nilai" ON log_perubahan_nilai FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_log_perubahan_nilai" ON log_perubahan_nilai FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_log_perubahan_nilai" ON log_perubahan_nilai FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_log_perubahan_nilai" ON log_perubahan_nilai FOR DELETE
  TO authenticated USING (true);