"""Explicit isolated test server; optional public read-only snapshot, never a seller."""
import argparse
import importlib.util
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
def module(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
server=module('readonly_fixture_server','apps/agent-gateway/server.py')
catalog=module('readonly_fixture_catalog','apps/agent-gateway/catalog.py')

def fixture_raw():
 def row(identifier,name,category,value):
  return {'id':identifier,'sku':identifier,'ean':'0012345678901' if identifier=='SYNTH-A' else '0012345678902',
          'name':name,'category':category,'source':'BigBuy','status':'catalog','stock':0,
          'price':f'{value:.2f} €','value':value,'evidence':'','created_at':'2026-10-11T00:00:00Z',
          'image':'/api/shop/image?src=https%3A%2F%2Fcdnbigbuy.com%2Fimages%2FUNVERIFIED.jpg'}
 return json.dumps({'items':[row('SYNTH-A','Synthetischer Filter','Synthetische Filter',7.06),
                             row('SYNTH-B','Synthetischer Reiniger','Synthetische Pflege',12.34)],'total':99}).encode()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--fixture-test-run',action='store_true',required=True)
 p.add_argument('--database',type=Path,required=True);p.add_argument('--web-origin',required=True)
 p.add_argument('--snapshot',type=Path);args=p.parse_args()
 if args.snapshot:
  raw,manifest=catalog.load_snapshot(args.snapshot,maximum_bytes=1048576);observed=manifest['observed_at']
 else:raw,observed=fixture_raw(),'2026-10-27T01:00:00+00:00'
 shop=catalog.ReadOnlyCatalog(raw,tenant='local-readonly-review',project='public-snapshot-review',
   store_id='readonly-review',observed_at=observed,max_bytes=1048576,max_rows=20,max_text=1024,max_price_minor=100000000)
 api=server.build_server(server.Store(args.database),port=0,web_origin=args.web_origin,shop=shop)
 print(json.dumps({'port':api.server_port}),flush=True);api.serve_forever()
