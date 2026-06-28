const fs = require('fs');
const path = require('path');

const artists = [
  'alex_campos',
  'abel_zavala',
  'barak',
  'bethel_music',
  'christine_dclario',
  'coalo_zamorano',
  'corazon',
  'coros_unidos',
  'danilo_montero',
  'danny_berrios',
  'ebenezer',
  'elevation_worship',
  'en_espiritu_y_en_verdad',
  'evan_craft',
  'generacion_12',
  'hillsong_united',
  'ingrid_rosario',
  'inspiracion',
  'jesus_adrian_romero',
  'jose_luis_reyes',
  'juan_carlos_alvarado',
  'julio_melgar',
  'marcela_gandara',
  'marco_barrientos',
  'marcos_brunet',
  'marcos_witt',
  'miel_san_marcos',
  'montesanto',
  'musica_religiosa',
  'new_wine',
  'oasis_ministry',
  'palabra_en_accion',
  'rojo',
  'vino_nuevo'
];

function analizarTonalidadAvanzado(texto, notasMelodia = []) {
      if (!texto) return { tonalidad: 'C', modo: 'Mayor', puntuacionFinal: 0, explicacion: { error: 'Sin texto para analizar.' } };

      const chordRegex = /\b(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])[#b]?(?:m|maj7|m7|7|sus4|sus2|dim|aug)?(?:\/[CDEFGAB][#b]?)?\b/gi;

      const parrafos = texto.split(/\n\s*\n/);
      const secciones = [];
      let acordesGlobales = [];
      let transiciones = [];

      for (const p of parrafos) {
        const lineas = p.split('\n');
        let acordesSeccion = [];
        let tipoSeccion = 'General';

        if (lineas.length > 0) {
          const primeraLinea = lineas[0].toLowerCase();
          if (primeraLinea.includes('coro') || primeraLinea.includes('chorus')) tipoSeccion = 'Coro';
          else if (primeraLinea.includes('verso') || primeraLinea.includes('verse')) tipoSeccion = 'Verso';
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

async function scrapeArtist(slug) {
  const outPath = path.join(__dirname, 'repertorio', `${slug}_corregido.json`);
  
  // Si el archivo ya existe y tiene datos, nos lo saltamos para ahorrar tiempo y no duplicar trabajo
  if (fs.existsSync(outPath)) {
    try {
      const stats = fs.statSync(outPath);
      if (stats.size > 200) {
        console.log(`⏩ [Saltado] El archivo para "${slug}" ya existe y tiene datos (${outPath})`);
        return;
      }
    } catch (e) {}
  }

  const baseUrl = `https://acordes.lacuerda.net/${slug}/`;
  console.log(`\n🔍 Conectando con LaCuerda para: "${slug}"...`);
  
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) {
      console.log(`❌ Error al conectar con la página del artista "${slug}" (Status: ${res.status}).`);
      return;
    }
    
    const buffer = await res.arrayBuffer();
    const decoder = new TextDecoder('windows-1252');
    const html = decoder.decode(buffer);
    
    const hrefMatches = html.match(/href=["']([^"']+)["']/gi) || [];
    const linksSet = new Set();
    
    hrefMatches.forEach(h => {
      const href = h.replace(/href=["']|["']/g, '');
      if (href.startsWith('http') || href.startsWith('//') || href.startsWith('javascript:') || href.startsWith('/') || href.startsWith('#')) return;
      
      const parts = href.split('/');
      if (parts.length > 1) return;
      
      const excluir = ['afinador','recursos','foro','usuario','favoritos','guitarra','piano','videos','tabs', 'csh', 'htm', 'html', 'shtml', 'css', 'js', 'png', 'jpg', 'gif'];
      if (excluir.some(x => href.includes(x))) return;
      if (href.trim().length < 3) return;
      
      linksSet.add(href);
    });
    
    const songUrls = Array.from(linksSet).map(songSlug => {
      const cleanSlug = songSlug.replace(/\.shtml$/, '');
      return {
        slug: cleanSlug,
        url: `https://acordes.lacuerda.net/${slug}/${cleanSlug}.shtml`,
        name: cleanSlug.replace(/_/g, ' ')
      };
    });
    
    if (songUrls.length === 0) {
      console.log(`⚠️ No se encontraron canciones para "${slug}".`);
      return;
    }
    
    console.log(`✅ Se encontraron ${songUrls.length} canciones para "${slug}". Iniciando descarga...`);
    
    const resultado = [];
    
    for (let i = 0; i < songUrls.length; i++) {
      const s = songUrls[i];
      
      try {
        const resp = await fetch(s.url);
        if (!resp.ok) {
          console.log(`  [${i+1}/${songUrls.length}] ❌ Falló la descarga de "${s.name}"`);
          continue;
        }
        
        const songBuf = await resp.arrayBuffer();
        const songHtml = decoder.decode(songBuf);
        
        const titleMatch = songHtml.match(/<TITLE>([^:]+):/i) || songHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        let nombre = titleMatch ? titleMatch[1].trim() : s.name;
        
        nombre = nombre
          .replace(new RegExp(`,?\\s*${slug.replace(/_/g, ' ')}`, 'gi'), '')
          .replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs|chords|lyric|lyrics|acordes\s+y\s+letra|letra\s+y\s+acordes|acordes\s+y\s+tab|tab\s+y\s+acordes)\s*\)?/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        const preMatches = songHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi) || [];
        const cleanPreMatches = preMatches.map(m => m.replace(/<[^>]*>/g, ''));
        const bestIdx = cleanPreMatches.findIndex(c => c.trim().length > 10);
        const bestPre = bestIdx !== -1 ? preMatches[bestIdx] : (preMatches[0] || '');
        const letra = bestPre.replace(/<[^>]*>/g, '').trim();
        
        let tonoBase = analizarTonalidadAvanzado(letra).tonalidad;
        
        const formattedArtist = slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        resultado.push({
          nombre,
          artista: formattedArtist,
          tonoBase,
          tipo: 'alabanza',
          letra,
          youtube: ''
        });
        
      } catch (e) {
        console.log(`  [${i+1}/${songUrls.length}] ❌ Error en "${s.name}": ${e.message}`);
      }
      
      // Espera de 400ms para evitar sobrecargar el servidor
      await new Promise(r => setTimeout(r, 400));
    }
    
    fs.writeFileSync(outPath, JSON.stringify(resultado, null, 2), 'utf-8');
    console.log(`\x1b[32m%s\x1b[0m`, `🎉 ¡Completado! Guardado: ${resultado.length} canciones en ${outPath}`);
    
  } catch (err) {
    console.error(`❌ Error general en "${slug}":`, err);
  }
}

async function scrapeAll() {
  console.log(`🚀 INICIANDO DESCARGA EN LOTE DE ${artists.length} ARTISTAS...`);
  const start = Date.now();
  
  for (const slug of artists) {
    await scrapeArtist(slug);
  }
  
  const diff = ((Date.now() - start) / 1000 / 60).toFixed(2);
  console.log(`\n🎉 🎉 🎉 ¡TODAS LAS DESCARGAS COMPLETADAS EN ${diff} MINUTOS! 🎉 🎉 🎉`);
}

scrapeAll();
