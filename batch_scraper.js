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

async function scrapeArtist(slug) {
  const outPath = path.join(__dirname, `${slug}_corregido.json`);
  
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
        
        let tonoBase = 'C';
        const odesMatch = songHtml.match(/odes\s*=\s*['"]([^'"]+)['"]/);
        if (odesMatch) {
          const cleanOdes = odesMatch[1].replace(/@/g, '#');
          const chords = cleanOdes.split(/\s+/).filter(Boolean);
          if (chords.length > 0) {
            const primerAcorde = chords[0];
            const cleanMatch = primerAcorde.match(/^([A-G][#b]?)(m)?/i);
            if (cleanMatch) {
              let nota = cleanMatch[1];
              nota = nota.charAt(0).toUpperCase() + nota.substring(1).toLowerCase();
              const esMenor = cleanMatch[2] ? 'm' : '';
              tonoBase = nota + esMenor;
            }
          }
        } else {
          const tonoMatch = songHtml.match(/[Tt]ono[:\s]+([A-Ga-g][#bm]*)/);
          if (tonoMatch) tonoBase = tonoMatch[1];
        }
        
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
