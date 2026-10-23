import sys, numpy as np
from PIL import Image
from scipy import ndimage
def key(path, color='green', soft=(40,110)):
    im = Image.open(path).convert('RGB'); a = np.asarray(im).astype(np.float32)
    r,g,b = a[...,0],a[...,1],a[...,2]
    if color=='green':
        spill = g - np.maximum(r,b)
    else:  # magenta
        spill = np.minimum(r,b) - g
    lo,hi = soft
    alpha = 1 - np.clip((spill-lo)/(hi-lo),0,1)
    # despill
    if color=='green':
        mx=np.maximum(r,b); g2=np.where(g>mx, mx+(g-mx)*0.15, g); a[...,1]=g2
    else:
        mn=g; r2=np.where(r>mn+10, np.minimum(r, np.maximum(mn,b)*1.0+ (r-np.maximum(mn,b))*0.5), r)
        b2=np.where(b>mn+10, np.minimum(b, np.maximum(mn,r)*1.0+ (b-np.maximum(mn,r))*0.5), b)
        m=(spill>5)&(alpha<1); a[...,0]=np.where(m,(r+g)/2*0+r2,r); a[...,2]=np.where(m,b2,b)
    rgba = np.dstack([np.clip(a,0,255), alpha*255]).astype(np.uint8)
    return Image.fromarray(rgba,'RGBA')
def pieces(img, min_area=4000, pad=12, merge=18):
    al = np.asarray(img)[...,3] > 40
    al = ndimage.binary_dilation(al, iterations=merge)
    lab, n = ndimage.label(al)
    boxes=[]
    for sl in ndimage.find_objects(lab):
        ys,xs=sl; h=ys.stop-ys.start; w=xs.stop-xs.start
        if h*w<min_area: continue
        boxes.append([xs.start+merge,ys.start+merge,xs.stop-merge,ys.stop-merge])
    return boxes
if __name__=='__main__':
    src, color, out = sys.argv[1], sys.argv[2], sys.argv[3]
    img = key(src, color)
    img.save(out)
    print(pieces(img))

def extract(img, merge=6, min_area=3000, pad=10):
    arr = np.asarray(img).copy()
    al = arr[...,3] > 20
    dil = ndimage.binary_dilation(al, iterations=merge)
    lab, n = ndimage.label(dil)
    out=[]
    for k,sl in enumerate(ndimage.find_objects(lab), start=1):
        ys,xs=sl
        if (ys.stop-ys.start)*(xs.stop-xs.start)<min_area: continue
        m = (lab==k)
        piece = arr.copy(); piece[...,3] = np.where(m, piece[...,3], 0)
        y0=max(0,ys.start-pad+merge); y1=min(arr.shape[0],ys.stop+pad-merge); x0=max(0,xs.start-pad+merge); x1=min(arr.shape[1],xs.stop+pad-merge)
        out.append(((x0,y0,x1,y1), Image.fromarray(piece[y0:y1,x0:x1],'RGBA')))
    # 위→아래(행), 왼→오 정렬: 행은 중심 y로 묶기
    return out

def save_pieces(pieces, names, outdir, maxh=None, q=88):
    import os
    os.makedirs(outdir, exist_ok=True)
    for (box,im),nm in zip(pieces,names):
        if maxh and im.height>maxh:
            im = im.resize((round(im.width*maxh/im.height), maxh), Image.LANCZOS)
        im.save(f'{outdir}/{nm}.webp', quality=q, method=6)
        print(nm, box, im.size)

def sort_grid(pieces, rows):
    # rows: 행 개수. 중심 y로 행을 나누고 각 행 안에서 x 정렬
    cs = sorted(pieces, key=lambda p:(p[0][1]+p[0][3])/2)
    if rows<=1: return sorted(pieces, key=lambda p:p[0][0])
    ys = np.array([(p[0][1]+p[0][3])/2 for p in cs])
    # k-means 1D 간단히: 정렬 후 가장 큰 간격 rows-1개로 자르기
    gaps = np.argsort(np.diff(ys))[::-1][:rows-1]
    cuts = sorted(gaps+1)
    groups = np.split(np.array(cs, dtype=object), cuts)
    res=[]
    for g in groups: res += sorted(list(g), key=lambda p:p[0][0])
    return res

def grid_cells(img, cols, rows, names, outdir, maxw=360, inset=0, q=88):
    import os
    os.makedirs(outdir, exist_ok=True)
    W,H = img.size; cw,ch = W/cols, H/rows
    arr = np.asarray(img)
    k=0
    for r in range(rows):
        for c in range(cols):
            if k>=len(names): return
            nm=names[k]; k+=1
            if not nm: continue
            x0,y0,x1,y1 = int(c*cw)+inset, int(r*ch)+inset, int((c+1)*cw)-inset, int((r+1)*ch)-inset
            sub = arr[y0:y1, x0:x1].copy()
            # 칸 안 가장 큰 덩어리만 남기기 (이웃 칸에서 넘어온 조각 제거)
            al = sub[...,3]>20
            lab,n = ndimage.label(ndimage.binary_dilation(al, iterations=3))
            if n>1:
                sizes = ndimage.sum(al, lab, range(1,n+1)); keep = 1+int(np.argmax(sizes))
                # 큰 덩어리와 그 크기의 8% 이상 덩어리는 유지
                ok = [i+1 for i,s in enumerate(sizes) if s >= sizes.max()*0.18]
                sub[...,3] = np.where(np.isin(lab, ok), sub[...,3], 0)
            ys,xs = np.where(sub[...,3]>20)
            bx0,bx1,by0,by1 = xs.min(),xs.max()+1,ys.min(),ys.max()+1
            im = Image.fromarray(sub[max(0,by0-6):by1+6, max(0,bx0-6):bx1+6],'RGBA')
            if im.width>maxw: im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
            im.save(f'{outdir}/{nm}.webp', quality=q, method=6); print(nm, im.size)

def comp_cells(img, cols, rows, names, outdir, maxw=220, merge=3, q=88, min_px=400):
    import os
    os.makedirs(outdir, exist_ok=True)
    arr = np.asarray(img); W,H = img.size
    al = arr[...,3] > 20
    lab, n = ndimage.label(ndimage.binary_dilation(al, iterations=merge) if merge>0 else al)
    cells = {}
    for k in range(1, n+1):
        m = (lab==k) & al
        cnt = m.sum()
        if cnt < min_px: continue
        ys, xs = np.nonzero(m)
        cx, cy = xs.mean(), ys.mean()
        ci = min(cols-1, int(cx / (W/cols))) + cols*min(rows-1, int(cy / (H/rows)))
        cells.setdefault(ci, []).append((cnt, m))
    for ci, nm in enumerate(names):
        if not nm or ci not in cells: print('missing', nm); continue
        parts = sorted(cells[ci], key=lambda t:-t[0])
        big = parts[0][0]
        mask = np.zeros_like(al)
        for cnt, m in parts:
            if cnt >= big*0.04: mask |= m
        mask = ndimage.binary_dilation(mask, iterations=2) & (arr[...,3]>0)
        ys, xs = np.nonzero(mask)
        y0,y1,x0,x1 = max(0,ys.min()-4), ys.max()+5, max(0,xs.min()-4), xs.max()+5
        piece = arr[y0:y1, x0:x1].copy(); piece[...,3] = np.where(mask[y0:y1,x0:x1], piece[...,3], 0)
        im = Image.fromarray(piece, 'RGBA')
        if im.width>maxw: im = im.resize((maxw, round(im.height*maxw/im.width)), Image.LANCZOS)
        if im.height>maxw*1.3: im = im.resize((round(im.width*maxw*1.3/im.height), round(maxw*1.3)), Image.LANCZOS)
        im.save(f'{outdir}/{nm}.webp', quality=q, method=6); print(nm, im.size)
