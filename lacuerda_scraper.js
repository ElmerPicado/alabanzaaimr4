/**
 * SCRIPT PARA LA CONSOLA DE LA CUERDA (lacuerda.net)
 * ----------------------------------------------------
 * Instrucciones:
 * 1. Entra a la página del artista en lacuerda.net (ejemplo: https://acordes.lacuerda.net/alex_campos/)
 * 2. Abre la consola del navegador (F12 -> Consola / Console).
 * 3. Pega este script completo y presiona Enter.
 * 4. Confirma la descarga. Se generará un archivo JSON con los tonos correctos y letras decodificadas sin corrupción de acentos.
 */
(async function () {
  // Verificar que estamos en el dominio correcto
  if (!window.location.hostname.includes('lacuerda.net')) {
    alert("Debes estar en lacuerda.net para correr este script.");
    return;
  }

  const artistSlug = window.location.pathname.split('/').filter(Boolean)[0];
  const artistName = (document.querySelector('h1')?.textContent || artistSlug)
    .replace(/acordes de/i, '').replace(/canciones de/i, '').trim();

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

      const excluir = ['afinador', 'recursos', 'foro', 'usuario', 'favoritos', 'guitarra', 'piano', 'videos', 'tabs'];
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

    console.log(`[%c${i + 1}%c/%c${unicos.length}%c] Descargando: %c${nombre}%c...`,
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

      // === DETECCIÓN DEL TONO BASE (KEY) AVANZADA ===
      let textoParaAnalisis = letra || '';
      const odesMatch = html.match(/odes\s*=\s*['"]([^'"]+)['"]/);
      if (odesMatch) {
        const cleanOdes = odesMatch[1].replace(/@/g, '#');
        textoParaAnalisis += " " + cleanOdes;
      } else {
        const tonoMatch = html.match(/[Tt]ono[:\s]+([A-Ga-g][#bm]*)/);
        if (tonoMatch) textoParaAnalisis += " " + tonoMatch[1];
      }

      // Algoritmo insertado
      function analizarTonalidadAvanzado(texto) {
        if (!texto) return 'C';
        const acordesEncontrados = [];
        const chordRegex = /\b(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])[#b]?(?:m|maj7|m7|7|sus4|sus2|dim|aug)?\b/gi;
        
        let match;
        while ((match = chordRegex.exec(texto)) !== null) {
          let t = match[0].toUpperCase();
          const tr = {'DO':'C','RE':'D','MI':'E','FA':'F','SOL':'G','LA':'A','SI':'B'};
          for(let k in tr) t = t.replace(k, tr[k]);
          t = t.charAt(0) + t.slice(1).toLowerCase();
          acordesEncontrados.push(t);
        }

        if (acordesEncontrados.length === 0) return 'C';

        const basicChords = acordesEncontrados.map(c => c.replace(/maj7|m7|7|sus4|sus2|dim|aug/i, ''));
        const freq = {};
        basicChords.forEach(c => freq[c] = (freq[c] || 0) + 1);

        const firstChord = basicChords[0];
        const lastChord = basicChords[basicChords.length - 1];
        const mostFrequent = Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b);

        const keys = {
          'C': ['C','Dm','Em','F','G','Am','Bdim'], 'G': ['G','Am','Bm','C','D','Em','F#dim'], 'D': ['D','Em','F#m','G','A','Bm','C#dim'],
          'A': ['A','Bm','C#m','D','E','F#m','G#dim'], 'E': ['E','F#m','G#m','A','B','C#m','D#dim'], 'B': ['B','C#m','D#m','E','F#','G#m','A#dim'],
          'F#': ['F#','G#m','A#m','B','C#','D#m','E#dim'], 'F': ['F','Gm','Am','Bb','C','Dm','Edim'], 'Bb': ['Bb','Cm','Dm','Eb','F','Gm','Adim'],
          'Eb': ['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'], 'Ab': ['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'], 'Db': ['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'],
          'Am': ['Am','Bdim','C','Dm','Em','F','G'], 'Em': ['Em','F#dim','G','Am','Bm','C','D'], 'Bm': ['Bm','C#dim','D','Em','F#m','G','A'],
          'F#m': ['F#m','G#dim','A','Bm','C#m','D','E'], 'C#m': ['C#m','D#dim','E','F#m','G#m','A','B'], 'G#m': ['G#m','A#dim','B','C#m','D#m','E','F#'],
          'D#m': ['D#m','E#dim','F#','G#m','A#m','B','C#'], 'Dm': ['Dm','Edim','F','Gm','Am','Bb','C'], 'Gm': ['Gm','Adim','Bb','Cm','Dm','Eb','F'],
          'Cm': ['Cm','Ddim','Eb','Fm','Gm','Ab','Bb'], 'Fm': ['Fm','Gdim','Ab','Bbm','Cm','Db','Eb'], 'Bbm': ['Bbm','Cdim','Db','Ebm','Fm','Gb','Ab']
        };

        let bestScore = -1;
        let bestKey = 'C';

        for (const [keyName, diatonic] of Object.entries(keys)) {
          let score = 0;
          basicChords.forEach(c => { 
            if (diatonic.includes(c)) score += 1; 
            else score -= 1.5;
          });
          const I = diatonic[0]; const IV = diatonic[3]; const V = diatonic[4];
          if (freq[I]) score += freq[I] * 1.5;
          if (freq[IV]) score += freq[IV] * 1.2;
          if (freq[V]) score += freq[V] * 1.2;
          if (firstChord === I) score += 5;
          if (lastChord === I) score += 5;

          if (score > bestScore) {
            bestScore = score;
            bestKey = keyName;
          } else if (score === bestScore) {
             if (lastChord === keyName || mostFrequent === keyName) bestKey = keyName;
          }
        }
        return bestKey;
      }
      
      let tonoBase = analizarTonalidadAvanzado(textoParaAnalisis);

      resultado.push({
        nombre,
        artista: artistName,
        tonoBase,
        tipo: 'alabanza',
        letra,
        youtube: ''
      });

    } catch (e) {
      console.warn(`⚠️ Saltando "${nombre}" por error: ${e.message}`);
    }

    // Espera prudencial de 400ms para evitar saturar el servidor y ser bloqueados
    await new Promise(r => setTimeout(r, 400));
  }

  // Descargar el archivo JSON generado
  const json = JSON.stringify(resultado, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
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
