
    // ============================================================
    // RENDER ENSAYOS – VISTA ADMIN (tarjetas ricas con confirmaciones)
    // ============================================================
    window.renderEnsayosAdmin = function () {
      const cont = document.getElementById('ensayo-list');
      if (!cont) return;
      cont.innerHTML = '';
      if (!db || !collection || !onSnapshot) return;
      onSnapshot(collection(db, 'ensayos'), (snap) => {
        const ensayos = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          data.id = docSnap.id;
          ensayos.push(data);
        });
        if (ensayos.length === 0) {
          cont.innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No hay ensayos programados aún. Crea uno con el botón de arriba.</p>`;
          return;
        }
        ensayos.sort((a, b) => a.fecha.localeCompare(b.fecha));
        cont.innerHTML = '';
        ensayos.forEach(e => {
          const totalMiembros = e.miembros ? e.miembros.length : 0;
          const confirmados = Object.values(e.confirmaciones || {}).filter(v => v === true).length;
          const songNames = (e.canciones || []).map(sid => {
            const s = (window.cacheSongs || []).find(x => x.id === sid);
            return s ? s.nombre : sid;
          }).join(', ') || 'Sin canciones';

          const card = document.createElement('div');
          card.className = 'card';
          card.style.cssText = 'margin-bottom:12px; border-color: var(--teal);';
          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:16px; font-weight:600; color:var(--text); margin-bottom:4px;">🎵 ${e.nombre}</div>
                <div style="font-size:12px; color:var(--teal); margin-bottom:4px;">📅 ${e.fecha}${e.hora ? ' &nbsp;⏰ ' + e.hora : ''}</div>
                <div style="font-size:11px; color:var(--text3); margin-bottom:6px;">👥 ${confirmados}/${totalMiembros} confirmados</div>
                <div style="font-size:11px; color:var(--text2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🎶 ${songNames}</div>
              </div>
              <div style="display:flex; flex-direction:column; gap:6px; margin-left:10px; flex-shrink:0;">
                <button class="btn-ver-conf chip chip-teal" style="cursor:pointer; border:none; padding:6px 12px; font-weight:600; white-space:nowrap;">👁 Confirmaciones</button>
                <button class="btn-del-ensayo chip chip-coral" style="cursor:pointer; border:none; padding:6px 12px; font-weight:600;" data-id="${e.id}">🗑 Eliminar</button>
              </div>
            </div>
          `;
          card.querySelector('.btn-ver-conf').addEventListener('click', () => openEnsayoAdmin(e.id));
          card.querySelector('.btn-del-ensayo').addEventListener('click', async () => {
            if (confirm(`¿Eliminar el ensayo "${e.nombre}"?`)) {
              await deleteDoc(doc(db, 'ensayos', e.id));
              showToast('🗑 Ensayo eliminado');
            }
          });
          cont.appendChild(card);
        });
      });
    }

    // Admin: ver tabla de confirmaciones
    window.openEnsayoAdmin = function (id) {
      if (!doc || !db || !getDoc) return;
      const docRef = doc(db, 'ensayos', id);
      getDoc(docRef).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        const confs = data.confirmaciones || {};
        const miembros = data.miembros || [];
        let lista = '';
        miembros.forEach(uid => {
          const m = (window.cacheMembers || []).find(x => x.usuario === uid);
          const nombre = m ? m.nombre : uid;
          const estado = confs[uid] === true ? '✅ Confirmado' : '❌ Sin confirmar';
          lista += `\n  • ${nombre}: ${estado}`;
        });
        const confirmed = Object.values(confs).filter(v => v === true).length;
        alert(`Ensayo: ${data.nombre}\nFecha: ${data.fecha}${data.hora ? ' ⏰ ' + data.hora : ''}\nConfirmados: ${confirmed}/${miembros.length}\n${lista}`);
      });
    }

    // ============================================================
    // RENDER ENSAYOS – VISTA MÚSICO (tarjetas con canciones + YouTube)
    // ============================================================
    window.renderEnsayosMusico = function () {
      const musicoId = activeSessionUser?.usuario;
      if (!musicoId) return;
      const cont = document.getElementById('ensayo-list-musico');
      if (!cont) return;
      cont.innerHTML = '';
      if (!db || !collection || !onSnapshot) return;

      onSnapshot(collection(db, 'ensayos'), (snap) => {
        const ensayos = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          data.id = docSnap.id;
          ensayos.push(data);
        });
        const filtered = ensayos.filter(e => e.miembros && e.miembros.includes(musicoId));
        cont.innerHTML = '';
        if (filtered.length === 0) {
          cont.innerHTML = `<p style='color:var(--text3);font-size:13px;text-align:center;padding:20px;'>No tienes ensayos programados todavía.</p>`;
          return;
        }
        filtered.sort((a, b) => a.fecha.localeCompare(b.fecha));

        filtered.forEach(e => {
          const confirmed = e.confirmaciones && e.confirmaciones[musicoId] === true;

          // Build songs HTML with YouTube links
          const songIds = e.canciones || [];
          let songsHtml = '';
          if (songIds.length > 0) {
            songsHtml = '<div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">';
            songsHtml += '<div style="font-size:10px; text-transform:uppercase; color:var(--gold); letter-spacing:0.8px; margin-bottom:8px;">🎶 Canciones a ensayar</div>';
            songIds.forEach((sid, idx) => {
              const s = (window.cacheSongs || []).find(x => x.id === sid);
              if (!s) return;
              const ytLink = s.youtube && s.youtube.trim()
                ? `<a href="${s.youtube}" target="_blank" rel="noopener" style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,0,0,0.12); color:#ff4444; border:1px solid rgba(255,0,0,0.25); border-radius:6px; padding:3px 8px; font-size:10px; font-weight:600; text-decoration:none; margin-left:8px;">▶ YouTube</a>`
                : '';
              songsHtml += `<div style="display:flex; align-items:center; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
                <span style="font-size:18px; color:var(--teal); min-width:28px; text-align:center;">${idx + 1}</span>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:13px; font-weight:500; color:var(--text);">${s.nombre}</div>
                  <div style="font-size:11px; color:var(--text3);">${s.artista} · <span class="chip-type chip-${s.tipo}">${s.tipo}</span></div>
                </div>
                ${ytLink}
              </div>`;
            });
            songsHtml += '</div>';
          }

          const card = document.createElement('div');
          card.className = 'card';
          card.style.cssText = `margin-bottom:14px; border-color:${confirmed ? 'var(--gold)' : 'var(--teal)'};`;
          card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:16px; font-weight:600; color:var(--text); margin-bottom:2px;">🎵 ${e.nombre}</div>
                <div style="font-size:12px; color:var(--teal);">📅 ${e.fecha}${e.hora ? ' &nbsp;⏰ <b>' + e.hora + '</b>' : ''}</div>
              </div>
              <button class="btn-confirm-ensayo btn-primary" data-id="${e.id}" style="background:${confirmed ? 'var(--gold)' : 'var(--teal)'}; color:#0f0e17; width:auto; padding:8px 14px; margin-top:0; margin-left:10px; flex-shrink:0; font-size:12px;">${confirmed ? '✅ Confirmado' : 'Confirmar'}</button>
            </div>
            ${songsHtml}
          `;
          card.querySelector('.btn-confirm-ensayo').addEventListener('click', (ev) => {
            toggleEnsayoConfirm(e.id, musicoId, ev.currentTarget);
          });
          cont.appendChild(card);
        });
      });
    }

    function toggleEnsayoConfirm(ensayoId, userId, btnElem) {
      const docRef = doc(db, 'ensayos', ensayoId);
      getDoc(docRef).then(snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        const current = !!(data.confirmaciones && data.confirmaciones[userId]);
        const newVal = !current;
        updateDoc(docRef, { [`confirmaciones.${userId}`]: newVal }).then(() => {
          btnElem.textContent = newVal ? '✅ Confirmado' : 'Confirmar';
          btnElem.style.background = newVal ? 'var(--gold)' : 'var(--teal)';
          // update card border
          const parentCard = btnElem.closest('.card');
          if (parentCard) parentCard.style.borderColor = newVal ? 'var(--gold)' : 'var(--teal)';
          showToast(newVal ? '✅ Asistencia confirmada' : '❌ Confirmación cancelada');
        });
      });
    }
  