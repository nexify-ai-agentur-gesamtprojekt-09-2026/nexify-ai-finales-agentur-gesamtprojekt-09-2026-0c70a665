const locales = ['de', 'nl', 'fr'];
function translated(value) {
  if (!value || locales.some(locale => typeof value[locale] !== 'string' || !value[locale].trim())) throw new Error('Invalid explainer translation');
  return Object.fromEntries(locales.map(locale => [locale, value[locale]]));
}
function ownAsset(value, extension) {
  return typeof value === 'string' && !value.includes('..') && new RegExp('^/media/[A-Za-z0-9/_-]+\\.(?:' + extension + ')$').test(value);
}
export function prepareExplainers(source, pages, sourceInventory, verifiedVideos = {}, verifiedModules = {}) {
  const ids = new Set(pages.map(page => page.id));
  if (source?.schema_version !== 1 || !Array.isArray(source.pages) || source.pages.length !== ids.size) throw new Error('Explainer coverage incomplete');
  const seen = new Set();
  return source.pages.map(page => {
    if (!ids.has(page.page_id) || seen.has(page.page_id)) throw new Error('Unknown, private or duplicate explainer page');
    seen.add(page.page_id);
    if (!Array.isArray(page.modules) || page.modules.length < 1 || page.modules.length > 3) throw new Error('Invalid explainer module count');
    const modules = new Set();
    return {page_id: page.page_id, modules: page.modules.map(module => {
      if (typeof module.id !== 'string' || !/^[a-z0-9_-]+$/.test(module.id) || modules.has(module.id)) throw new Error('Invalid explainer ID');
      modules.add(module.id);
      if (!['pascal', 'nex', 'aifly'].includes(module.speaker) || !['left', 'right'].includes(module.media_side)) throw new Error('Invalid explainer presentation');
      const action = module.next_action;
      if (action?.type !== 'route' || !ids.has(action.target_id)) throw new Error('Invalid explainer action target');
      const media = module.media;
      if (!media || !['asset_pending', 'published'].includes(media.status)) throw new Error('Invalid explainer media status');
      if (media.status === 'asset_pending' && (media.src !== null || media.captions !== null)) throw new Error('Pending explainer media must not pretend to be available');
      if (media.status === 'published' && (!ownAsset(media.src, 'mp4|webm') || locales.some(locale => !ownAsset(media.captions?.[locale], 'vtt')))) throw new Error('Published explainer requires owned video and all captions');
      if (media.status === 'published' && locales.some(locale => {const checked=verifiedModules[page.page_id]?.[module.id]?.[locale];return !checked || checked.locale!==locale || checked.src!==media.src || checked.captionsSrc!==media.captions[locale];})) throw new Error('Published explainer has no matching verified asset binding');
      if (!Array.isArray(module.source_refs) || !module.source_refs.length || module.source_refs.some(ref => typeof ref !== 'string' || !sourceInventory?.has(ref) || !/^[a-f0-9]{64}$/.test(sourceInventory.get(ref)))) throw new Error('Explainer provenance missing or not verified');
      return {id: module.id, speaker: module.speaker, title: translated(module.title), body: translated(module.body), outcome: translated(module.outcome), media_side: module.media_side,
        media: {status: media.status, src: media.src, captions: media.captions ? translated(media.captions) : null},
        next_action: {type: 'route', target_id: action.target_id, label: translated(action.label)}, source_refs: []};
    })};
  });
}
