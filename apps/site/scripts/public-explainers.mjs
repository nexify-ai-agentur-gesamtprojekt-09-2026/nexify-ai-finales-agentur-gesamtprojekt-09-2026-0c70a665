const locales = ['de', 'nl', 'fr', 'en'];
const legacyLocales = ['de', 'nl', 'fr'];
const videoLocales = ['de', 'nl', 'fr'];
function translated(value, requiredLocales = locales) {
  if (!value || requiredLocales.some(locale => typeof value[locale] !== 'string' || !value[locale].trim())) throw new Error('Invalid explainer translation');
  return Object.fromEntries(requiredLocales.map(locale => [locale, value[locale]]));
}
function ownAsset(value, extension) {
  return typeof value === 'string' && !value.includes('..') && new RegExp('^/media/[A-Za-z0-9/_-]+\\.(?:' + extension + ')$').test(value);
}
/** Resolve customer copy from the canonical page instead of maintaining script duplicates. */
export function resolveExplainerReferences(source, pages) {
  return {...source,pages:source.pages.map(page=>({...page,modules:page.modules.map(module=>{
    if(!module.content_ref)return module;
    if(module.content_ref.page_id!==page.page_id)throw new Error('explainer_public_page_binding: Cross-page explainer content reference');
    const canonical=pages.find(candidate=>candidate.id===page.page_id);
    const section=canonical?.sections?.find(section=>section.id===module.content_ref.section_id);
    if(!section)throw new Error('Missing canonical explainer section');
    return {...module,title:section.heading,body:section.body,outcome:module.next_action?.label};
  })}))};
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
      if (media.status === 'published' && (!ownAsset(media.src, 'mp4|webm') || videoLocales.some(locale => !ownAsset(media.captions?.[locale], 'vtt')))) throw new Error('Published explainer requires owned video and all captions');
      if (media.status === 'published' && videoLocales.some(locale => {const checked=verifiedModules[page.page_id]?.[module.id]?.[locale];return !checked || checked.locale!==locale || checked.src!==media.src || checked.captionsSrc!==media.captions[locale];})) throw new Error('Published explainer has no matching verified asset binding');
      if (!Array.isArray(module.source_refs) || !module.source_refs.length || module.source_refs.some(ref => typeof ref !== 'string' || !sourceInventory?.has(ref) || !/^[a-f0-9]{64}$/.test(sourceInventory.get(ref)))) throw new Error('Explainer provenance missing or not verified');
      // Canonical legacy/legal text is preserved in its actual approved source locales.
      // Page references require all four customer locales; this never fabricates legal English.
      const textLocales = module.content_ref ? locales : legacyLocales;
      let copy=module;
      if(module.content_ref){
        if(module.content_ref.page_id!==page.page_id)throw new Error('explainer_public_page_binding: Cross-page explainer content reference');
        const canonical=pages.find(candidate=>candidate.id===page.page_id);
        const section=canonical?.sections?.find(section=>section.id===module.content_ref.section_id);
        if(!section)throw new Error('Missing canonical explainer section');
        copy={title:section.heading,body:section.body,outcome:action.label};
      }
      return {id: module.id, content_section_id: module.content_ref?.section_id ?? null, speaker: module.speaker, title: translated(copy.title,textLocales), body: translated(copy.body,textLocales), outcome: translated(copy.outcome,textLocales), media_side: module.media_side,
        media: {status: media.status, src: media.src, captions: media.captions ? Object.fromEntries(videoLocales.map(locale => [locale, media.captions[locale]])) : null},
        next_action: {type: 'route', target_id: action.target_id, label: translated(action.label,textLocales)}, source_refs: []};
    })};
  });
}
