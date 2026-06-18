/**
 * SCRIPT PARA LA CONSOLA DE LA CUERDA (lacuerda.net)
 * ----------------------------------------------------
 * Instrucciones:
 * 1. Entra a la página del artista en lacuerda.net (ejemplo: https://acordes.lacuerda.net/alex_campos/)
 * 2. Abre la consola del navegador (F12 -> Consola / Console).
 * 3. Pega este script completo y presiona Enter.
 * 4. Confirma la descarga. Se generará un archivo JSON con los tonos correctos y letras decodificadas sin corrupción de acentos.
 */
(async function() {
  // Verificar que estamos en el dominio correcto
  if (!window.location.hostname.includes('lacuerda.net')) {
    alert("Debes estar en lacuerda.net para correr este script.");
    return;
  }

  const artistSlug = window.location.pathname.split('/').filter(Boolean)[0];
  const artistName = (document.querySelector('h1')?.textContent || artistSlug)
    .replace(/acordes de/i,'').replace(/canciones de/i,'').trim();

  console.log(`%c🎨 Artista detectado: "${artistName}" (slug: ${artistSlug})`, "color: #4ecdc4; font-weight: bold; font-size: 14px;");

  // Filtro estricto: solo links que sean canciones del artista
  const songLinks = Array.from(document.querySelectorAll('a[href]')).filter(a => {
    try {
      const url = new URL(a.href);
      if (url.hostname !== window.location.hostname) return false;
      
      const parts = url.pathname.split('/').filter(Boolean);
      // Debe tener exactamente 2 partes: /artista/cancion.shtml
      if (parts.length !== 2) return false;
      if (parts[0] !== artistSlug) return false;
      
      const excluir = ['afinador','recursos','foro','usuario','favoritos','guitarra','piano','videos','tabs'];
      if (excluir.some(x => parts[1].includes(x))) return false;
      if (a.textContent.trim().length < 3) return false;
      
      return true;
    } catch { return false; }
  });

  // Eliminar duplicados
  const unicos = [];
  const vistos = new Set();
  songLinks.forEach(a => {
    if (!vistos.has(a.href)) {
      vistos.add(a.href);
      unicos.push(a);
    }
  });

  if (unicos.length === 0) {
    console.warn("⚠️ No se encontraron canciones. ¿Estás en la página de acordes del artista (ej: acordes.lacuerda.net/nombre_artista/)?");
    return;
  }

  console.log(`✅ ${unicos.length} canciones encontradas.`);
  
  const ok = confirm(`Se encontraron ${unicos.length} canciones de "${artistName}".\n\n¿Quieres descargarlas todas con sus letras y tonos corregidos?`);
  if (!ok) return;

  const resultado = [];
  
  for (let i = 0; i < unicos.length; i++) {
    const a = unicos[i];
    let nombre = a.textContent.trim();
    
    // Limpieza de sufijos del nombre de la canción
    nombre = nombre
      .replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs|chords|lyric|lyrics|acordes\s+y\s+letra|letra\s+y\s+acordes|acordes\s+y\s+tab|tab\s+y\s+acordes)\s*\)?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
      
    console.log(`[%c${i+1}%c/%c${unicos.length}%c] Descargando: %c${nombre}%c...`, 
      "color: #ff6b6b; font-weight: bold;", "", 
      "color: #4ecdc4; font-weight: bold;", "",
      "color: #f4c542; font-weight: bold;", "");
      
    try {
      const resp = await fetch(a.href);
      
      // LaCuerda.net usa codificación Windows-1252 (ISO-8859-1).
      // Si usamos resp.text() directamente, se corrompen los acentos y la eñe (ñ).
      // Por eso obtenemos el arrayBuffer y lo decodificamos explícitamente.
      const buffer = await resp.arrayBuffer();
      const decoder = new TextDecoder('windows-1252');
      const html = decoder.decode(buffer);
      
      const doc2 = new DOMParser().parseFromString(html, 'text/html');
      
      // Letra y acordes (están en <pre id="tCode"> o en el primer <pre> que aparezca)
      // Buscamos el <pre> que tenga contenido (más de 10 caracteres) para evitar el <pre id='tCode'></pre> vacío
      const preElements = Array.from(doc2.querySelectorAll('pre, PRE'));
      const pre = preElements.find(p => p.textContent.trim().length > 10) || preElements[0];
      const letra = pre ? pre.textContent : '';

      // === DETECCIÓN DEL TONO BASE (KEY) ===
      let tonoBase = 'C';
      
      // LaCuerda define los acordes utilizados en una variable javascript global: odes='C G Am F...'
      const odesMatch = html.match(/odes\s*=\s*['"]([^'"]+)['"]/);
      if (odesMatch) {
        // Reemplazar @ con # para los sostenidos (LaCuerda usa @ internamente para #)
        const cleanOdes = odesMatch[1].replace(/@/g, '#');
        const chords = cleanOdes.split(/\s+/).filter(Boolean);
        if (chords.length > 0) {
          const primerAcorde = chords[0];
          // Limpiar el acorde para obtener solo la nota raíz y si es menor (ej. Ab, Bbm, F#)
          // Excluyendo extensiones como 7, maj7, sus4, 9, etc.
          const cleanMatch = primerAcorde.match(/^([A-G][#b]?)(m)?/i);
          if (cleanMatch) {
            let nota = cleanMatch[1];
            // Normalizar (ej: Ab, F#, Bb, C)
            nota = nota.charAt(0).toUpperCase() + nota.substring(1).toLowerCase();
            const esMenor = cleanMatch[2] ? 'm' : '';
            tonoBase = nota + esMenor;
          }
        }
      } else {
        // Fallback: buscar la etiqueta "Tono: X" en el HTML
        const tonoMatch = html.match(/[Tt]ono[:\s]+([A-Ga-g][#bm]*)/);
        if (tonoMatch) tonoBase = tonoMatch[1];
      }

      resultado.push({
        nombre,
        artista: artistName,
        tonoBase,
        tipo: 'alabanza',
        letra,
        youtube: ''
      });
      
    } catch(e) {
      console.warn(`⚠️ Saltando "${nombre}" por error: ${e.message}`);
    }
    
    // Espera prudencial de 400ms para evitar saturar el servidor y ser bloqueados
    await new Promise(r => setTimeout(r, 400));
  }

  // Descargar el archivo JSON generado
  const json = JSON.stringify(resultado, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const dl = Object.assign(document.createElement('a'), {
    href: url,
    download: `${artistSlug}_corregido.json`
  });
  
  document.body.appendChild(dl);
  dl.click();
  dl.remove();
  
  console.log(`%c✅ ¡Completado! Descargado: "${artistSlug}_corregido.json" con ${resultado.length} canciones.`, "color: #4ecdc4; font-weight: bold; font-size: 14px;");
})();
