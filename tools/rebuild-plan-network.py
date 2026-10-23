#!/usr/bin/env python3
"""Compile source polygon hit areas and provisional concourse routes. See docs/MAP_PROVENANCE.md."""
import json,re,heapq,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy import ndimage,sparse
from scipy.sparse.csgraph import dijkstra
import argparse,tempfile
from urllib.request import Request,urlopen
parser=argparse.ArgumentParser(description='Rebuild exact source polygons and provisional plan-derived routing.');parser.add_argument('--html',type=Path);parser.add_argument('--qa-dir',type=Path);args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
html=args.html.read_text() if args.html else urlopen(Request('https://www.simedarbyproperty.com/malls/kleast-mall/',headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode()
data=json.loads((ROOT/'dist/directory.json').read_text())
names={'mapBasement':'B','mapLowerGround':'LG','mapG1':'G1','mapG2':'G2','mapG3':'G3'}
polys={}
for m in re.finditer(r'(mapBasement|mapLowerGround|mapG1|mapG2|mapG3):\s*\{',html):
 end=html.find('rectanglesData:',m.end()); end2=html.find('\n                },',end)
 block=html[end:end2]; floor=names[m[1]];polys[floor]=[]
 for p in re.finditer(r'\{ id:\s*(\d+), coords:\s*(\[\[.*?\]\]), popupContent:',block):
  pts=json.loads(p[2]);xy=[[round((lng+2700)/7500*1000,2),round(75+(1800-lat)/3700*500,2)] for lat,lng in pts]
  polys[floor].append({'id':'s'+p[1],'points':xy})

for p in polys['LG']:
 if p['id']=='s97':p['sourceId']='97';p['id']='s200'
for p in polys['G1']:
 if p['id']=='s200':p['sourceId']='200';p['id']='source-G1-200'
print({f:len(p) for f,p in polys.items()})
for s in data['stores']:
 p=next((p for p in polys[s['floor']] if p['id']==s['id']),None)
 if p:s['mapPoint']={'x':round(sum(x for x,y in p['points'])/len(p['points']),2),'y':round(sum(y for x,y in p['points'])/len(p['points']),2),'source':'official-map-polygon-centroid'}
 else: print('MISSING POLYGON',s['id'],s['name'])
(ROOT/'dist/directory.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
(ROOT/'dist/geometry.json').write_text(json.dumps({'version':2,'source':data['mall']['source'],'bounds':[[-1900,-2700],[1800,4800]],'canvas':[1000,650],'imageRect':[0,75,1000,500],'floors':polys},separators=(',',':')))

anchors={'B':[(210,275),(697,275),(536,325)],'LG':[(220,234),(704,230),(480,325)],'G1':[(214,250),(711,252),(489,350)],'G2':[(250,257),(715,252),(509,350)],'G3':[(223,285),(695,260),(484,347)]}
nodes=[];edges=[];masks={}
for f in ['B','LG','G1','G2','G3']:
 im=Image.open(ROOT/f'dist/assets/plan-{f}.png').convert('RGBA').resize((1000,500));a=np.array(im)

 grey=(a[:,:,:3].max(2)-a[:,:,:3].min(2)<5)&(a[:,:,0]>190)&(a[:,:,0]<239)&(a[:,:,3]>230)
 grey=ndimage.binary_closing(grey,iterations=3)

 pm=Image.new('1',(1000,500));dr=ImageDraw.Draw(pm)
 for p in polys[f]:dr.polygon([(x,y-75) for x,y in p['points']],fill=1)
 grey &= ~np.array(pm,dtype=bool)

 envelopes={
 'LG':[(120,275),(155,220),(210,165),(245,200),(390,155),(575,160),(710,205),(735,250),(720,320),(625,320),(610,305),(340,320),(315,355),(255,355),(250,320),(210,300),(165,300)],
 'G1':[(92,225),(115,195),(150,180),(185,205),(210,210),(290,220),(400,165),(590,175),(710,215),(745,255),(720,345),(680,365),(600,355),(580,335),(410,332),(310,365),(160,405),(100,340)],
 'G2':[(130,250),(155,240),(220,200),(250,205),(290,235),(420,175),(600,180),(700,215),(740,255),(720,350),(675,365),(600,340),(410,340),(330,370),(190,400),(130,335)],
 'G3':[(215,215),(285,200),(345,180),(395,165),(575,170),(650,195),(715,235),(735,275),(715,335),(660,340),(625,305),(580,310),(410,310),(365,320),(330,285),(315,260),(275,225)]}
 if f in envelopes:
  roi=Image.new('1',(1000,500));ImageDraw.Draw(roi).polygon(envelopes[f],fill=1);grey &= np.array(roi,dtype=bool)
 grey=ndimage.binary_erosion(grey,iterations=1)
 lab,n=ndimage.label(grey);counts=np.bincount(lab.ravel());counts[0]=0;grey=lab==counts.argmax()

 mask=grey[::2,::2];lab,n=ndimage.label(mask);cnt=np.bincount(lab.ravel());cnt[0]=0;mask=lab==cnt.argmax();masks[f]=mask
 yy,xx=np.where(mask); coords=np.column_stack([xx*2,yy*2+75]);grid=np.full(mask.shape,-1,dtype=int);grid[yy,xx]=np.arange(len(xx))
 def snap(x,y):
  return int(np.argmin((coords[:,0]-x)**2+(coords[:,1]-y)**2))
 fn=[];term=[]
 for key,(x,y),name,typ in zip(['west','east','centre'],anchors[f],['West lift lobby','East lift lobby','Central escalator'],['lift','lift','escalator']):
  if f=='B' and typ=='escalator':continue
  idx=snap(x,y);px,py=coords[idx];n={'id':f+'-'+key,'floor':f,'x':int(px),'y':int(py),'name':name+' · '+f,'type':typ,'verified':False,'provenance':'plan-traced-pictogram'};fn.append(n);term.append(idx)
 if f=='B':
  for zone,xy,name in [('A',anchors[f][0],'West lobby approach'),('B',(349,350),'Inner west lobby approach'),('C',anchors[f][1],'East lobby approach')]:
   idx=snap(*xy);px,py=coords[idx];fn.append({'id':f'B-park-{zone}','floor':f,'x':int(px),'y':int(py),'name':name,'type':'parking','verified':False,'provenance':'pilot-checkpoint-not-official-bay'});term.append(idx)
 for s in data['stores']:
  p=next((p for p in polys[f] if p['id']==s['id']),None)
  if not p:continue
  shop=Image.new('1',(500,250));ImageDraw.Draw(shop).polygon([(x/2,(y-75)/2) for x,y in p['points']],fill=1)
  distance=ndimage.distance_transform_edt(~np.array(shop,dtype=bool))*2
  dd=distance[yy,xx];minimum=dd.min();candidates=np.where(dd<=minimum+2)[0]

  idx=int(candidates[np.argmin((coords[candidates,0]-480)**2+(coords[candidates,1]-320)**2)])
  px,py=coords[idx];fn.append({'id':s['id'] if s['floor']==f else s['id']+'-'+f,'directoryId':s['id'],'directoryFloor':s['floor'],'floor':f,'x':int(px),'y':int(py),'name':s['name'],'lot':s['lot'],'category':s['category'],'type':'store','verified':False,'provenance':'source-polygon-concourse-approach','approachGap':round(float(dd[idx]),1)});term.append(idx)

 clearance=ndimage.distance_transform_edt(mask);rr=[];cc=[];cost=[]
 for dy,dx in [(0,1),(1,0),(1,1),(1,-1)]:
  for y,x in zip(yy,xx):
   ny,nx=y+dy,x+dx
   if not(0<=ny<250 and 0<=nx<500 and mask[ny,nx]):continue
   if dx and dy and not(mask[y,nx] and mask[ny,x]):continue
   u,v=grid[y,x],grid[ny,nx];w=math.hypot(dx,dy)*(1+1.5/(1+min(clearance[y,x],clearance[ny,nx])))
   rr.extend([u,v]);cc.extend([v,u]);cost.extend([w,w])
 mat=sparse.csr_matrix((cost,(rr,cc)),shape=(len(xx),len(xx)))
 ds,preds=dijkstra(mat,indices=term,return_predecessors=True)
 def compress(path):
  out=[path[0]]
  for i in range(1,len(path)-1):
   a,b,c=path[i-1],path[i],path[i+1]
   if (b[0]-a[0])*(c[1]-b[1])!=(b[1]-a[1])*(c[0]-b[0]):out.append(b)
  if len(path)>1:out.append(path[-1])
  return out
 pairs=set();fac=[i for i,n in enumerate(fn) if n['type']!='store']
 for i in range(len(fn)):
  nearest=np.argsort(ds[i,term])[:10]
  for j in list(nearest)+fac:
   if j!=i:pairs.add(tuple(sorted((i,int(j)))))
 for i,j in sorted(pairs):
  end=term[j];p=[end]
  while end!=term[i]:
   end=int(preds[i,end])
   if end<0:raise ValueError(f'Disconnected {f} {fn[i]} {fn[j]}')
   p.append(end)
  path=[coords[k].tolist() for k in p[::-1]];length=sum(math.dist(a,b) for a,b in zip(path,path[1:]));path=compress(path)
  edges.append({'id':fn[i]['id']+'~'+fn[j]['id'],'a':fn[i]['id'],'b':fn[j]['id'],'type':'walk','path':path,'metres':round(length*.22,2),'seconds':round(length*.22/1.1,2),'closed':False,'verified':False,'provenance':'published-plan-concourse-trace'})
 nodes.extend(fn)

 qa=im.convert('RGB');draw=ImageDraw.Draw(qa)
 for e in edges:
  if e['a'] in [n['id'] for n in fn] and e['b'] in [n['id'] for n in fn]:draw.line([(x,y-75) for x,y in e['path']],fill='#53ab9a',width=1)
 for n in fn:draw.ellipse((n['x']-3,n['y']-78,n['x']+3,n['y']-72),fill='red')
 if args.qa_dir:
  args.qa_dir.mkdir(parents=True,exist_ok=True);qa.save(args.qa_dir/f'trace-{f}.jpg')
 print(f,len(fn),len(xx),'walkable cells',flush=True)
for a,b in zip(['B','LG','G1','G2'],['LG','G1','G2','G3']):
 for bank in ['west','east']:
  edges.append({'id':f'{a}-{bank}~{b}-{bank}','a':f'{a}-{bank}','b':f'{b}-{bank}','type':'lift','metres':0,'seconds':35,'closed':False,'verified':False,'provenance':'provisional-cross-floor-bank-link'})
 if a!='B':edges.append({'id':f'{a}-centre~{b}-centre','a':f'{a}-centre','b':f'{b}-centre','type':'escalator','metres':0,'seconds':27,'closed':False,'verified':False,'provenance':'provisional-cross-floor-escalator-link'})
g={'version':2,'seedRevision':'2026-10-22-plan-2','layout':'official-plan-derived','verified':False,'scale':'illustrative-0.22m-per-plan-unit-not-surveyed','nodes':nodes,'edges':edges}
(ROOT/'dist/plan-network.mjs').write_text('export default '+json.dumps(g,separators=(',',':'))+';\n')
print('TOTAL',len(nodes),len(edges),'max storefront gap',max(n.get('approachGap',0) for n in nodes))
