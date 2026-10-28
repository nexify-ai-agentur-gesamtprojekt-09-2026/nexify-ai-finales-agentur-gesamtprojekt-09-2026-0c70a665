from pathlib import Path
import json,hashlib,zipfile
SOURCE=Path('.local/media-coverage/source/NeXify-Video-Vorproduktion-20261027.zip')
OUTPUT=Path('.local/media-manifest-fix/NeXify-Video-Vorproduktion-20261027.zip')
sha=lambda data:hashlib.sha256(data).hexdigest()
assert sha(SOURCE.read_bytes())=='281197b1a8eb4990670ec2de75d6699e58f0d11cd7a235638a5a8404f78b0e3b'
with zipfile.ZipFile(SOURCE) as z:
 infos=z.infolist();names=[i.filename for i in infos]
 assert len(names)==len(set(names)) and len(names)==35
 assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in names)
 assert sum(i.file_size for i in infos)<2_000_000
 raw={n:z.read(n) for n in names}
outer=json.loads(raw['delivery-manifest.json']);inner=json.loads(raw['script-package-manifest.json'])
assert len(outer['files'])==34 and len(inner['files'])==33
for item in outer['files']:
 assert len(raw[item['path']])==item['bytes'] and sha(raw[item['path']])==item['sha256']
changes=[]
for item in inner['files']:
 data=raw[item['path']]
 if len(data)!=item['bytes'] or sha(data)!=item['sha256']:
  assert item['path'] in {'ElevenLabs-Voice-Casting.de.md','voice-casting-options.de.json'}
  changes.append({'path':item['path'],'before':dict(item),'after':{'path':item['path'],'bytes':len(data),'sha256':sha(data)}})
  item.update(bytes=len(data),sha256=sha(data))
assert len(changes)==2
updated=dict(raw)
updated['script-package-manifest.json']=(json.dumps(inner,ensure_ascii=False,indent=2)+'\n').encode()
for item in outer['files']:
 if item['path']=='script-package-manifest.json':
  item.update(bytes=len(updated[item['path']]),sha256=sha(updated[item['path']]))
updated['delivery-manifest.json']=(json.dumps(outer,ensure_ascii=False,indent=2)+'\n').encode()
with zipfile.ZipFile(OUTPUT,'w') as z:
 for info in infos:z.writestr(info,updated[info.filename])
with zipfile.ZipFile(OUTPUT) as z:
 assert z.namelist()==names
 assert {n for n in names if z.read(n)!=raw[n]}=={'script-package-manifest.json','delivery-manifest.json'}
 for name in ['script-package-manifest.json','delivery-manifest.json']:
  for item in json.loads(z.read(name))['files']:
   assert item['bytes']==len(z.read(item['path'])) and item['sha256']==sha(z.read(item['path']))
 assert json.loads(z.read('voice-casting-options.de.json'))['status']=='casting_options_not_approved'
 assert json.loads(z.read('voice-casting-options.de.json'))['all_audio_unheard'] is True
report={'library_file_id':'libfile_4c255bb88af48191a025daecac648997','expected_current_version':0,'old_archive_sha256':sha(SOURCE.read_bytes()),'new_archive_sha256':sha(OUTPUT.read_bytes()),'changed_entries':['script-package-manifest.json','delivery-manifest.json'],'payload_files_byte_identical':33,'outer_validated_entries':34,'inner_validated_entries':33,'casting_changes':changes,'source_truth':'existing outer delivery manifest already matches all actual bytes; stale inner hash/size entries reconciled only','approval_changed':False,'media_generated':False,'texts_changed':False}
Path('.local/media-manifest-fix/reconciliation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report))
