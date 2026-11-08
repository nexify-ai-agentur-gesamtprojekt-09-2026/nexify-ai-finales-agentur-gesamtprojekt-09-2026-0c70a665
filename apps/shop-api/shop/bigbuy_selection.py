"""Additive, bounded selection import. Never deactivates, deletes or claims a full snapshot.

Works on standalone Mongo: each validated product is an atomic upsert. A failed
run can leave valid imported items; counts and partial provenance stay explicit.
The transactional full-catalog importer remains unchanged.
"""
import asyncio
import uuid
from .bigbuy_import import BigBuyClient, BigBuyReadError, find_roots, build_product, stock_total
from .db import db, now_iso


def row_for(data, product_id):
    rows = data if isinstance(data, list) else [data]
    return next((r for r in rows if isinstance(r, dict) and r.get('id') == product_id), None)


async def import_selection(actor, max_pages=3, run_id=None):
    run_id = run_id or str(uuid.uuid4())
    stamp = now_iso()
    await db.imports.update_one({'_id':run_id},{'$set':{'status':'running','mode':'additive_selection','partial':True,'source':'BigBuy','environment':'production','started_at':stamp,'started_by':actor}},upsert=True)
    stored, skipped, seen = 0, 0, set()
    try:
        client=BigBuyClient('production')
        taxonomy=await client.get('/rest/catalog/taxonomies.json',{'isoCode':'de'})
        if not isinstance(taxonomy,list): raise BigBuyReadError('taxonomy_schema')
        names={t['id']:t['name'] for t in taxonomy if isinstance(t,dict) and type(t.get('id')) is int and isinstance(t.get('name'),str)}
        roots=find_roots(taxonomy)
        if not roots: raise BigBuyReadError('category_auto_motorrad_not_found')
        scope={r:r for r in roots}
        for _ in range(len(taxonomy)):
            previous=len(scope)
            for t in taxonomy:
                if t.get('parentTaxonomy') in scope: scope[t['id']]=scope[t['parentTaxonomy']]
            if len(scope)==previous: break
        for root in roots:
            for page in range(max_pages):
                batch=await client.get('/rest/catalog/products.json',{'parentTaxonomy':root,'page':page,'pageSize':100})
                if not isinstance(batch,list): raise BigBuyReadError('catalog_page_schema')
                if not batch: break
                fresh=0
                for row in batch:
                    pid=row.get('id') if isinstance(row,dict) else None
                    if type(pid) is not int or pid<=0: raise BigBuyReadError('catalog_row_identity')
                    if pid in seen: continue
                    seen.add(pid);fresh+=1
                    if row.get('taxonomy') not in scope: skipped+=1;continue
                    info=row_for(await client.get(f'/rest/catalog/productinformation/{pid}.json',{'isoCode':'de'}),pid)
                    stock=row_for(await client.get(f'/rest/catalog/productstockbyhandlingdays/{pid}.json',{}),pid)
                    if not info or not isinstance(info.get('name'),str) or not info['name'].strip() or not stock:
                        skipped+=1;continue
                    try: quantity=stock_total(stock)
                    except BigBuyReadError: skipped+=1;continue
                    image_data=row_for(await client.get(f'/rest/catalog/productimages/{pid}.json',{}),pid) or {}
                    product=build_product(row,info,image_data.get('images',[]),quantity,names,scope[row['taxonomy']],stamp,run_id,'production')
                    product.update(source_partial=True,source_mode='additive_selection',stock_by_handling=stock['stocks'],shipping_status='calculated_at_checkout')
                    product['active']=True
                    await db.products.update_one({'_id':product['_id']},{'$set':product,'$setOnInsert':{'first_imported_at':stamp}},upsert=True)
                    for cid in product['category_ids']:
                        await db.categories.update_one({'_id':cid},{'$set':{'name':names[cid],'root':cid in roots}},upsert=True)
                    stored+=1
                    await db.imports.update_one({'_id':run_id},{'$set':{'counts':{'stored':stored,'skipped':skipped,'observed':len(seen)}}})
                if not fresh: break  # provider repeated the same bounded selection
        if not stored: raise BigBuyReadError('no_valid_products_returned')
        await db.imports.update_one({'_id':run_id},{'$set':{'status':'done','finished_at':now_iso(),'taxonomy_ids':roots,'counts':{'stored':stored,'skipped':skipped,'observed':len(seen)},'coverage':'bounded_selection_not_complete_catalog'}})
    except Exception as exc:
        await db.imports.update_one({'_id':run_id},{'$set':{'status':'failed','finished_at':now_iso(),'error':str(exc) if isinstance(exc,BigBuyReadError) else type(exc).__name__,'counts':{'stored':stored,'skipped':skipped,'observed':len(seen)}}})
    return run_id



async def enrich_images():
    """Approved supplier-original photos only, never marketing substitutes."""
    from .catalog_api import supplier_image
    client=BigBuyClient('production')
    count=0
    async for product in db.products.find({'active':True}):
        pid=product.get('bigbuy_id')
        if not pid: continue
        try:
            payload=row_for(await client.get(f'/rest/catalog/productimages/{pid}.json',{}),pid) or {}
            images=sorted(payload.get('images',[]),key=lambda x:(not x.get('isCover',False),x.get('position',0)))
            urls=list(dict.fromkeys(url for item in images if (url:=supplier_image(item.get('url')))))
            if urls:
                await db.products.update_one({'_id':product['_id']},{'$set':{'images':urls,'image_source':'supplier_original','images_updated_at':now_iso()}})
                count+=1
        except BigBuyReadError:
            continue
    return count
