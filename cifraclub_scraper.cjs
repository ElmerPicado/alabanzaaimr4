const fs = require('fs');
const path = require('path');

// ==========================================
// CIFRACLUB SCRAPER SCRIPT
// ==========================================

const artistSlug = process.argv[2] || 'art-aguilera'; // ej. art-aguilera
const outputDir = path.join(__dirname, 'canciones_cifraclub');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<b>/gi, '')
    .replace(/<\/b>/gi, '');
}

async function scrapeArtist(slug) {
  console.log(`Buscando canciones para: ${slug}`);
  const baseUrl = `https://www.cifraclub.com/${slug}/`;
  
  try {
    const res = await fetch(baseUrl);
    const html = await res.text();
    
    // Encontrar todas las canciones del artista
    // Los links suelen estar en <a class="art_music-link" href="/slug/cancion/">
    const songLinks = [];
    const linkRegex = new RegExp(`href="(/${slug}/[^"]+)"`, 'g');
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const link = match[1];
      if (!link.includes('#') && !link.includes('letras') && !link.endsWith('/imprimir.html') && !songLinks.includes(link)) {
        // Solo la canción raíz, ej: /art-aguilera/hay-libertad/
        if (link.split('/').length === 4) {
          songLinks.push(link);
        }
      }
    }

    if (songLinks.length === 0) {
      console.log('No se encontraron canciones. Verifica el slug del artista.');
      return;
    }

    console.log(`Se encontraron ${songLinks.length} canciones. Extrayendo...`);

    const resultSongs = [];

    for (let i = 0; i < songLinks.length; i++) {
      const songUrl = `https://www.cifraclub.com${songLinks[i]}`;
      console.log(`[${i+1}/${songLinks.length}] Extrayendo: ${songUrl}`);
      
      try {
        const songRes = await fetch(songUrl);
        const songHtml = await songRes.text();
        
        // 1. Extraer el nombre de la canción
        let title = 'Desconocido';
        const titleMatch = songHtml.match(/<h1 class="t1">([^<]+)<\/h1>/i);
        if (titleMatch) title = titleMatch[1].trim();
        else {
          const titleTagMatch = songHtml.match(/<title>([^<]+)<\/title>/i);
          if (titleTagMatch) title = titleTagMatch[1].split('-')[0].trim();
        }

        // 2. Extraer los acordes y letras
        // CifraClub usa <pre> para la cifra
        const preMatch = songHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        if (!preMatch) {
          console.log(`  -> No se encontraron acordes para ${title}`);
          continue;
        }

        let rawCifra = preMatch[1];
        
        // CifraClub envuelve los acordes en <b>
        // Vamos a extraer el texto plano, decodificando entidades HTML
        rawCifra = decodeHtmlEntities(rawCifra);
        
        // Limpiar el texto (eliminar scripts, span tags, etc que puedan estar dentro del PRE)
        rawCifra = rawCifra.replace(/<[^>]+>/g, '');
        
        let analysis = analizarTonalidadAvanzado(rawCifra);
        let tone = typeof analysis === 'object' ? analysis.tonalidad : analysis;

        resultSongs.push({
          id: `cifraclub_${slug}_${i+1}`,
          nombre: title,
          artista: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          fuente: songUrl,
          tonoBase: tone,
          letra_acordes: rawCifra.trim()
        });

        // Esperar para no saturar el servidor
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`  -> Error extrayendo ${songUrl}:`, err.message);
      }
    }

    // Guardar el resultado en JSON
    const outputFile = path.join(outputDir, `${slug}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(resultSongs, null, 2), 'utf8');
    console.log(`\n¡Extracción completa! Se guardaron ${resultSongs.length} canciones en ${outputFile}`);

  } catch (error) {
    console.error('Error general:', error.message);
  }
}

scrapeArtist(artistSlug);

> function analizarTonalidadAvanzado(texto, notasMelodia = []) {
        if (!texto) return { tonalidad: 'C', modo: 'Mayor', puntuacionFinal: 0, explicacion: { error: 'Sin texto para 
analizar.' } };
  
        const chordRegex = 
/\b(DO|RE|MI|FA|SOL|LA|SI|[CDEFGAB])[#b]?(?:m|maj7|m7|7|sus4|sus2|dim|aug)?(?:\/[CDEFGAB][#b]?)?\b/gi;
  
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
      'C': ['C','Dm','Em','F','G','Am','Bdim'], 'G': ['G','Am','Bm','C','D','Em','F#dim'], 'D': 
['D','Em','F#m','G','A','Bm','C#dim'],
      'A': ['A','Bm','C#m','D','E','F#m','G#dim'], 'E': ['E','F#m','G#m','A','B','C#m','D#dim'], 'B': 
['B','C#m','D#m','E','F#','G#m','A#dim'],
      'F#': ['F#','G#m','A#m','B','C#','D#m','E#dim'], 'F': ['F','Gm','Am','Bb','C','Dm','Edim'], 'Bb': 
['Bb','Cm','Dm','Eb','F','Gm','Adim'],
      'Eb': ['Eb','Fm','Gm','Ab','Bb','Cm','Ddim'], 'Ab': ['Ab','Bbm','Cm','Db','Eb','Fm','Gdim'], 'Db': 
['Db','Ebm','Fm','Gb','Ab','Bbm','Cdim'],
      'Am': ['Am','Bdim','C','Dm','Em','F','G'], 'Em': ['Em','F#dim','G','Am','Bm','C','D'], 'Bm': 
['Bm','C#dim','D','Em','F#m','G','A'],
      'F#m': ['F#m','G#dim','A','Bm','C#m','D','E'], 'C#m': ['C#m','D#dim','E','F#m','G#m','A','B'], 'G#m': 
['G#m','A#dim','B','C#m','D#m','E','F#'],
      'D#m': ['D#m','E#dim','F#','G#m','A#m','B','C#'], 'Dm': ['Dm','Edim','F','Gm','Am','Bb','C'], 'Gm': 
['Gm','Adim','Bb','Cm','Dm','Eb','F'],
      'Cm': ['Cm','Ddim','Eb','Fm','Gm','Ab','Bb'], 'Fm': ['Fm','Gdim','Ab','Bbm','Cm','Db','Eb'], 'Bbm': 
['Bbm','Cdim','Db','Ebm','Fm','Gb','Ab']
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
    


