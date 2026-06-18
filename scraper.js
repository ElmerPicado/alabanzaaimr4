const fs = require('fs');
const path = require('path');

// Obtener el slug del artista desde la línea de comandos
const artistSlug = process.argv[2];

if (!artistSlug) {
  console.log("\x1b[31m%s\x1b[0m", "⚠️ Error: Debes especificar el slug del artista.");
  console.log("Ejemplo de uso:");
  console.log("  node scraper.js abel_zavala");
  console.log("  node scraper.js marcos_witt");
  console.log("  node scraper.js barak");
  process.exit(1);
}

async function scrapeArtist(slug) {
  const baseUrl = `https://acordes.lacuerda.net/${slug}/`;
  console.log(`\n🔍 Conectando con LaCuerda para obtener canciones de: "${slug}"...`);
  
  try {
    const res = await fetch(baseUrl);
    if (!res.ok) {
      console.log("\x1b[31m%s\x1b[0m", `❌ Error al conectar con la página del artista (Status: ${res.status}). Verifica el slug.`);
      process.exit(1);
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
      console.log("\x1b[33m%s\x1b[0m", "⚠️ No se encontraron canciones. Verifica que el slug del artista sea correcto.");
      process.exit(1);
    }
    
    console.log(`\x1b[32m%s\x1b[0m`, `✅ Se encontraron ${songUrls.length} canciones.`);
    console.log(`Iniciando descarga de letras y acordes... (Espera de 400ms entre canciones para evitar bloqueos)\n`);
    
    const resultado = [];
    
    for (let i = 0; i < songUrls.length; i++) {
      const s = songUrls[i];
      process.stdout.write(`[${i+1}/${songUrls.length}] Descargando: "${s.name}"... `);
      
      try {
        const resp = await fetch(s.url);
        if (!resp.ok) {
          console.log(`❌ Falló la descarga (Status: ${resp.status})`);
          continue;
        }
        
        const songBuf = await resp.arrayBuffer();
        const songHtml = decoder.decode(songBuf);
        
        // Extraer título
        const titleMatch = songHtml.match(/<TITLE>([^:]+):/i) || songHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        let nombre = titleMatch ? titleMatch[1].trim() : s.name;
        
        // Limpiar nombre de la canción
        nombre = nombre
          .replace(/,?\s*Abel Zavala/gi, '') // Limpiar artista específico si venía en el title
          .replace(new RegExp(`,?\\s*${slug.replace(/_/g, ' ')}`, 'gi'), '') // Limpiar dinámico
          .replace(/\s*[\(,\-]?\s*(acordes|letra|letras|tab|tabs|chords|lyric|lyrics|acordes\s+y\s+letra|letra\s+y\s+acordes|acordes\s+y\s+tab|tab\s+y\s+acordes)\s*\)?/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
          
        // Extraer PRE (letra)
        const preMatches = songHtml.match(/<pre[^>]*>([\s\S]*?)<\/pre>/gi) || [];
        const cleanPreMatches = preMatches.map(m => m.replace(/<[^>]*>/g, ''));
        const bestIdx = cleanPreMatches.findIndex(c => c.trim().length > 10);
        const bestPre = bestIdx !== -1 ? preMatches[bestIdx] : (preMatches[0] || '');
        const letra = bestPre.replace(/<[^>]*>/g, '').trim();
        
        // Detección de tono base
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
        
        // Formatear nombre del artista
        const formattedArtist = slug.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        resultado.push({
          nombre,
          artista: formattedArtist,
          tonoBase,
          tipo: 'alabanza',
          letra,
          youtube: ''
        });
        
        console.log(`\x1b[32m%s\x1b[0m`, `OK (Tono: ${tonoBase})`);
        
      } catch (e) {
        console.log(`\x1b[31m%s\x1b[0m`, `ERROR: ${e.message}`);
      }
      
      await new Promise(r => setTimeout(r, 400));
    }
    
    const outPath = path.join(__dirname, `${slug}_corregido.json`);
    fs.writeFileSync(outPath, JSON.stringify(resultado, null, 2), 'utf-8');
    
    console.log(`\n\x1b[32m%s\x1b[0m`, `🎉 ¡ÉXITO COMPLETO!`);
    console.log(`Archivo guardado en: ${outPath}`);
    console.log(`Canciones descargadas: ${resultado.length}\n`);
    
  } catch (err) {
    console.error('❌ Error general durante el scraping:', err);
  }
}

scrapeArtist(artistSlug);
