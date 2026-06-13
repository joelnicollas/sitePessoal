(function initTheme() {
  const STORAGE_KEY = 'theme';
  const root        = document.documentElement;

  function getPreferred() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (!icon) return;

    if (theme === 'light') {
      icon.className = 'ti ti-moon';
      btn.setAttribute('aria-label', 'Ativar modo escuro');
    } else {
      icon.className = 'ti ti-sun';
      btn.setAttribute('aria-label', 'Ativar modo claro');
    }
  }

  function toggleTheme() {
    const current = root.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  applyTheme(getPreferred());

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggleTheme);
    applyTheme(getPreferred());
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-section]');
  const sections     = document.querySelectorAll('section[id]');

  if (!sidebarItems.length || !sections.length) return;

  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      sidebarItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === id);
      });
    });
  }, {
    rootMargin: '-40% 0px -50% 0px',
    threshold: 0
  });

  sections.forEach(sec => observer.observe(sec));
});

(function initPrivateAuth() {
  const CORRECT_HASH = (typeof PRIVATE_HASH !== 'undefined') ? PRIVATE_HASH : '';
  const SESSION_KEY  = 'private_auth';

  async function sha256(message) {
    const encoded = new TextEncoder().encode(message);
    const buffer  = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function unlockPrivate() {
    const form    = document.getElementById('private-form');
    const content = document.getElementById('private-content');
    if (form)    form.style.display    = 'none';
    if (content) content.style.display = 'block';
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  function showAuthError(errorEl) {
    if (!errorEl) return;
    errorEl.textContent = 'Senha incorreta. Tente novamente.';
    errorEl.style.display = 'block';
    setTimeout(() => { errorEl.style.display = 'none'; }, 3000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') {
      unlockPrivate();
      return;
    }

    const form    = document.getElementById('private-form');
    const input   = document.getElementById('private-password');
    const btn     = document.getElementById('private-submit');
    const errorEl = document.getElementById('private-error');

    if (!form || !input || !btn) return;

    async function handleSubmit(e) {
      e.preventDefault();
      btn.disabled    = true;
      btn.textContent = 'Verificando…';

      const hash = await sha256(input.value);

      if (hash === CORRECT_HASH) {
        unlockPrivate();
      } else {
        showAuthError(errorEl);
        input.value     = '';
        btn.disabled    = false;
        btn.textContent = 'Entrar';
      }
    }

    form.addEventListener('submit', handleSubmit);
    btn.addEventListener('click',   handleSubmit);
  });
})();

function initFilters() {
  const filterBtns = document.querySelectorAll('[data-filter]');
  const certCards  = document.querySelectorAll('.cert-card[data-area]');

  if (!filterBtns.length || !certCards.length) return;

  function filterCerts(area) {
    certCards.forEach(card => {
      const match = area === 'all' || card.dataset.area === area;

      if (match) {
        card.style.display = '';
        requestAnimationFrame(() => { card.style.opacity = '1'; });
      } else {
        card.style.opacity = '0';
        setTimeout(() => {
          if (card.style.opacity === '0') card.style.display = 'none';
        }, 200);
      }
    });

    filterBtns.forEach(btn => {
      btn.classList.toggle('filter-active', btn.dataset.filter === area);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => filterCerts(btn.dataset.filter));
  });

  filterCerts('all');
}

async function initDynamicContent() {
  try {
    const res  = await fetch('data/data.json');
    const data = await res.json();

    renderCertificados(data.certificados);
    renderArtigos(data.artigos);
    renderProjetos(data.projetos);
    atualizarStats(data);
    
    initFilters();
  } catch (err) {
    console.error('Erro ao carregar data.json:', err);
  }
}

function renderCertificados(certs) {
  const grid = document.getElementById('cert-grid-dinamico');
  if (!grid) return;

  const statusMap = {
    concluido:    { cls: 'cs-done',     label: 'Concluído'    },
    em_andamento: { cls: 'cs-progress', label: 'Em andamento' },
    planejado:    { cls: 'cs-planned',  label: 'Planejado'    }
  };

  const emissores = {
    Google: { cls: 'ci-google', letra: 'G' },
    IBM:    { cls: 'ci-ibm',    letra: 'I' }
  };

  const areaMap = {
    ia:        { badgeCls: 'badge-ai',    label: 'IA'        },
    cloud:     { badgeCls: 'badge-cloud', label: 'Cloud'     },
    seguranca: { badgeCls: 'badge-sec',   label: 'Segurança' }
  };

  grid.innerHTML = certs.map(cert => {
    const st  = statusMap[cert.status]  || statusMap.planejado;
    const em  = emissores[cert.emissor] || { cls: 'ci-google', letra: cert.emissor[0] };
    const ar  = areaMap[cert.area]      || areaMap.ia;

    const verificarBtn = cert.link_verificacao
      ? `<a href="${cert.link_verificacao}" target="_blank" rel="noopener" class="cert-verify">
           <i class="ti ti-external-link" aria-hidden="true" style="font-size:11px"></i> Verificar
         </a>`
      : '';

    return `
      <div class="cert-card" data-area="${cert.area}">
        <div class="cert-top">
          <div class="cert-issuer">
            <div class="cert-icon ${em.cls}">${em.letra}</div>
            <div>
              <div class="cert-name">${cert.nome}</div>
              <div class="cert-issuer-name">${cert.emissor} · ${cert.plataforma}</div>
            </div>
          </div>
          <span class="cert-status ${st.cls}">${st.label}</span>
        </div>
        <div class="cert-meta">
          <span class="badge ${ar.badgeCls}" style="font-size:10px">${ar.label}</span>
          ${verificarBtn}
        </div>
      </div>`;
  }).join('');
}

function renderArtigos(artigos) {
  const list = document.getElementById('artigos-lista-dinamica');
  if (!list) return;

  const areaMap = {
    ia:        'badge-ai',
    cloud:     'badge-cloud',
    seguranca: 'badge-sec'
  };

  list.innerHTML = artigos.map((art, i) => `
    <a href="${art.link}" class="article-row">
      <span class="article-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="article-info">
        <div class="article-title">${art.titulo}</div>
        <div class="article-meta">
          <span class="badge ${areaMap[art.area] || 'badge-ai'}" style="font-size:10px">${art.tag}</span>
          <span>${art.data} · ${art.tempo_leitura}</span>
        </div>
      </div>
      <i class="ti ti-arrow-right article-arrow" aria-hidden="true"></i>
    </a>`
  ).join('');
}

function renderProjetos(projetos) {
  const grid = document.getElementById('projetos-grid-dinamico');
  if (!grid) return;

  const areaIconColor = {
    ia:        'var(--accent)',
    cloud:     'var(--accent2)',
    seguranca: 'var(--accent3)'
  };

  const areaTagCls = {
    ia:        'badge-ai',
    cloud:     'badge-cloud',
    seguranca: 'badge-sec'
  };

  grid.innerHTML = projetos.map(proj => `
    <div class="proj-card">
      <div class="proj-top">
        <span class="proj-name">
          <i class="ti ${proj.icone}" aria-hidden="true" style="color:${areaIconColor[proj.area] || 'var(--accent)'}"></i>
          ${proj.nome}
        </span>
        <a href="${proj.link_github}" target="_blank" rel="noopener" aria-label="Ver no GitHub">
          <i class="ti ti-brand-github" aria-hidden="true" style="color:var(--muted);font-size:15px"></i>
        </a>
      </div>
      <p class="proj-desc">${proj.descricao}</p>
      <div class="proj-tags">
        ${proj.tags.map(tag => `<span class="proj-tag ${areaTagCls[proj.area] || 'badge-ai'}">${tag}</span>`).join('')}
      </div>
    </div>`
  ).join('');
}

function atualizarStats(data) {
  const totalCerts = data.certificados.length;
  const totalArtigos = data.artigos.length;
  const totalProjetos = data.projetos.length;

  const elCerts    = document.getElementById('stat-certs');
  const elArtigos  = document.getElementById('stat-artigos');
  const elProjetos = document.getElementById('stat-projetos');

  if (elCerts)    elCerts.textContent    = totalCerts;
  if (elArtigos)  elArtigos.textContent  = totalArtigos;
  if (elProjetos) elProjetos.textContent = totalProjetos;
}

document.addEventListener('DOMContentLoaded', initDynamicContent);
