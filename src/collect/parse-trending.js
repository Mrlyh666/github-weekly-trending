import * as cheerio from 'cheerio';

// Parse a github.com/trending HTML page into a flat list of repo rows.
// `board` is accepted for interface symmetry with the collector but every row
// belongs to whichever board the caller fetched; boards are tracked by the
// collector, not here.
export function parseTrending(html, _board) {
  const $ = cheerio.load(html);
  const rows = [];
  $('article.Box-row').each((_, el) => {
    const a = $(el).find('h2 a[href]').first();
    const href = a.attr('href') || '';
    if (!href.startsWith('/')) return;
    const description = ($(el).find('p').first().text() || '').trim();
    const language =
      $(el).find('[itemprop="programmingLanguage"]').first().text().trim() ||
      undefined;
    rows.push({
      repo: href.slice(1),
      url: `https://github.com${href}`,
      description,
      language,
    });
  });
  return rows;
}