(() => {
  const $ = (id) => document.getElementById(id);
  const statusEl = $('status');
  const gallery = $('gallery');
  const countEl = $('file-count');
  const adminMessage = $('admin-message');
  const loginArea = $('login-area');
  const adminArea = $('admin-area');
  const authState = $('auth-state');

  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  const configured = url && key &&
    !url.includes('여기에_') && !key.includes('여기에_') &&
    window.supabase && window.supabase.createClient;

  if (!configured) {
    statusEl.textContent = 'Supabase 연결 정보가 아직 설정되지 않았어요. config.js에 Project URL과 Publishable key를 입력해 주세요.';
    $('login-form').querySelector('button').disabled = true;
    return;
  }

  const client = window.supabase.createClient(url, key);
  let files = [];
  let currentUser = null;

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);

  function setAdminView(user) {
    currentUser = user;
    const loggedIn = Boolean(user);
    loginArea.classList.toggle('hidden', loggedIn);
    adminArea.classList.toggle('hidden', !loggedIn);
    authState.textContent = loggedIn ? '로그인됨' : '로그아웃 상태';
    render();
  }

  async function loadFiles() {
    statusEl.textContent = '아카이브를 불러오는 중...';
    const { data, error } = await client.from('gif_files')
      .select('id,name,storage_path,mime_type,size_bytes,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      statusEl.textContent = '목록을 불러오지 못했어요: ' + error.message;
      return;
    }
    files = data || [];
    statusEl.textContent = files.length ? '' : '아직 등록된 이미지가 없어요.';
    render();
  }

  function render() {
    const sort = $('sort-select').value;
    const sorted = [...files];
    if (sort === 'oldest') sorted.sort((a,b) => new Date(a.created_at)-new Date(b.created_at));
    if (sort === 'name') sorted.sort((a,b) => a.name.localeCompare(b.name, 'ko'));
    countEl.textContent = sorted.length;
    gallery.innerHTML = '';
    for (const file of sorted) {
      const { data } = client.storage.from('archive').getPublicUrl(file.storage_path);
      const card = document.createElement('article');
      card.className = 'file-card';
      const safeName = escapeHtml(file.name);
      card.innerHTML = `
        <div class="preview-wrap"><img loading="lazy" src="${escapeHtml(data.publicUrl)}" alt="${safeName}"></div>
        <div class="file-info">
          <p class="file-name" title="${safeName}">${safeName}</p>
          <div class="file-actions">
            <a class="small-link" href="${escapeHtml(data.publicUrl)}" download="${safeName}" target="_blank" rel="noopener">다운로드</a>
            ${currentUser ? '<button class="delete-button" type="button">삭제</button>' : ''}
          </div>
        </div>`;
      const deleteButton = card.querySelector('.delete-button');
      if (deleteButton) deleteButton.addEventListener('click', () => deleteFile(file));
      gallery.appendChild(card);
    }
  }

  async function deleteFile(file) {
    if (!confirm(`"${file.name}" 파일을 삭제할까요?`)) return;
    adminMessage.textContent = '삭제 중...';
    const { error: storageError } = await client.storage.from('archive').remove([file.storage_path]);
    if (storageError) {
      adminMessage.textContent = '파일 삭제 실패: ' + storageError.message;
      return;
    }
    const { error: rowError } = await client.from('gif_files').delete().eq('id', file.id);
    if (rowError) {
      adminMessage.textContent = '파일은 삭제됐지만 목록 정리에 실패했어요. 관리자에게 알려 주세요.';
      await loadFiles();
      return;
    }
    adminMessage.textContent = '삭제했어요.';
    await loadFiles();
  }

  $('sort-select').addEventListener('change', render);

  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    adminMessage.textContent = '로그인 중...';
    const email = $('email').value.trim();
    const password = $('password').value;
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      adminMessage.textContent = '로그인 실패: 이메일과 비밀번호를 확인해 주세요.';
      return;
    }
    setAdminView(data.user);
    adminMessage.textContent = '로그인했어요.';
  });

  $('logout-button').addEventListener('click', async () => {
    const { error } = await client.auth.signOut();
    if (error) {
      adminMessage.textContent = '로그아웃 실패: ' + error.message;
      return;
    }
    setAdminView(null);
    adminMessage.textContent = '로그아웃했어요.';
  });

  $('upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const selected = [...$('file-input').files];
    if (!selected.length) return;
    adminMessage.textContent = '업로드 중...';
    let success = 0;
    for (const file of selected) {
      const allowed = ['image/gif','image/jpeg','image/png','image/webp'];
      if (!allowed.includes(file.type)) {
        adminMessage.textContent = `${file.name}: 지원하지 않는 파일 형식이에요.`;
        continue;
      }
      if (file.size > 25 * 1024 * 1024) {
        adminMessage.textContent = `${file.name}: 25MB를 초과했어요.`;
        continue;
      }
      const safeFileName = file.name.replace(/[^\p{L}\p{N}._-]/gu, '_');
      const path = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await client.storage.from('archive').upload(path, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) {
        adminMessage.textContent = `${file.name} 업로드 실패: ${uploadError.message}`;
        continue;
      }
      const { error: insertError } = await client.from('gif_files').insert({
        name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size
      });
      if (insertError) {
        await client.storage.from('archive').remove([path]);
        adminMessage.textContent = `${file.name}: 목록 등록에 실패했어요.`;
        continue;
      }
      success++;
    }
    $('file-input').value = '';
    adminMessage.textContent = `${success}개 파일 업로드 완료`;
    await loadFiles();
  });

  client.auth.getSession().then(({ data }) => setAdminView(data.session?.user || null));
  client.auth.onAuthStateChange((_event, session) => setAdminView(session?.user || null));
  loadFiles();
})();
