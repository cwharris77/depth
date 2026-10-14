"""Seats the facemask on the shell's four side screw holes and mounts the package's own clip parts."""
import bpy, numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from common import *

SRC = SOURCES / 'Speedflex+decon+shell_stls'
# Screw-hole centres and outward normals on the +x jaw flap, measured by ray-casting the shell.
HOLES = {'upper': (np.array([.0945, -.0088, .0214]), np.array([.961, -.277, -.003])),
         'lower': (np.array([.0759, -.0278, -.0662]), np.array([.937, -.274, -.217]))}
PIVOT = np.array([0, -.02, -.02])
PITCH, SHIFT = np.radians(-13), np.array([0, -.004, -.012])
CLIP_REACH = .018        # screw hole to bar channel on the clip part
BAR_STANDOFF = .0038     # bar centre above the shell surface

def stl(name):
    bpy.ops.wm.stl_import(filepath=str(SRC / name))
    o = bpy.context.object
    v = verts(o); v -= (v.min(0) + v.max(0)) / 2
    f = [tuple(p.vertices) for p in o.data.polygons]
    bpy.data.objects.remove(o)
    return v * .001, f

def bar_samples(mv):
    side = mv[(mv[:, 0] > .05) & (mv[:, 1] > -.085)]
    rng = np.random.default_rng(0)
    C, T = [], []
    for p in side[rng.choice(len(side), min(2500, len(side)), replace=False)]:
        near = side[np.linalg.norm(side - p, axis=1) < .013]
        if len(near) < 12: continue
        c = near.mean(0); s, vt = np.linalg.svd(near - c)[1:]
        if s[0] / s[1] > 2.6: C.append(c); T.append(vt[0])
    return np.array(C), np.array(T)

def pick_bar(C, T, H, N):
    rel = C - H; nc = rel @ N; tan = rel - np.outer(nc, N)
    r = np.linalg.norm(tan, axis=1); rh = tan / r[:, None]
    tt = T - np.outer(T @ N, N); tt /= np.linalg.norm(tt, axis=1)[:, None]
    perp = np.abs((tt * rh).sum(1))
    e = (r - CLIP_REACH) ** 2 + (CLIP_REACH * perp) ** 2 + np.where(rh[:, 1] > -.3, 1e-3, 0)
    i = e.argmin()
    return C[i], T[i], nc[i], r[i]

def build(root, mats):
    helmet = load_glb(root / 'speedflex-fused.glb')
    shell = next(o for o in helmet if 'shell' in o.name)
    mask = next(o for o in helmet if o.name.startswith('facemask'))
    finish(shell, 'helmet_shell', mats['shell']); finish(mask, 'facemask', mats['mask'])
    mv = verts(mask)
    R = np.array([[1, 0, 0], [0, np.cos(PITCH), -np.sin(PITCH)], [0, np.sin(PITCH), np.cos(PITCH)]])
    mv = (mv - PIVOT) @ R.T + PIVOT + SHIFT
    # Narrow the cage linearly with height so both side bars rest on the jaw flaps.
    C, T = bar_samples(mv)
    zs, sx = [], []
    for H, N in HOLES.values():
        c, t, nc, r = pick_bar(C, T, H, N)
        zs.append(c[2]); sx.append((c[0] - (nc - BAR_STANDOFF) / N[0]) / c[0])
    k = (sx[0] - sx[1]) / (zs[0] - zs[1])
    scale = np.clip(sx[1] + k * (mv[:, 2] - zs[1]), min(sx) - .03, max(sx) + .03)
    mv[:, 0] *= scale
    set_verts(mask, mv)
    C, T = bar_samples(mv)
    parts = {n: stl(f) for n, f in [('outer', 'obj_19_facemask clip outer.stl'), ('inner', 'obj_1_facemask clip inner.stl'),
                                    ('washer', 'obj_28_macemask washer.stl'), ('screw', 'obj_29_pad screw.stl')]}
    hardware, report = [], []
    for tier, (H, N) in HOLES.items():
        B, t, nc, r = pick_bar(C, T, H, N)
        # Clip frame: y runs screw -> bar, z points away from the shell, x follows the bar.
        seat = H + N * (BAR_STANDOFF + .0017)
        y = B + N * .0017 - seat; reach = np.linalg.norm(y); y /= reach
        z = N - (N @ y) * y; z /= np.linalg.norm(z)
        x = np.cross(y, z)
        M = np.stack([x, y, z], 1)
        stretch = np.array([1, reach / CLIP_REACH, 1])
        origin = B - M @ (np.array([0, .010, -.00315]) * stretch)
        hole = origin + M @ (np.array([0, -.008, 0]) * stretch)
        for side, label in [(1, 'right'), (-1, 'left')]:
            flip = np.array([side, 1, 1])
            def place(name, part, mat, offset=(0, 0, 0), zflip=False, at=None):
                v, f = parts[part]
                v = v * stretch if part in ('outer', 'inner') else v
                if zflip: v = v * [1, 1, -1] + [0, 0, -.0063]
                base = origin if at is None else at
                o = mesh_object(name, (base + (v + offset) @ M.T) * flip, f)
                fix_normals(o); finish(o, name, mat, smooth=False)
                mod = o.modifiers.new('Normals', 'WEIGHTED_NORMAL'); mod.keep_sharp = True
                for p in o.data.polygons: p.use_smooth = True
                select([o]); bpy.ops.object.shade_auto_smooth(angle=np.radians(40))
                hardware.append(o)
            place(f'clip_outer_{label}_{tier}', 'outer', mats['clip'])
            place(f'clip_inner_{label}_{tier}', 'inner', mats['clip'], zflip=True)
            place(f'washer_{label}_{tier}', 'washer', mats['steel'], at=hole, offset=(0, 0, .0008))
            place(f'screw_{label}_{tier}', 'screw', mats['steel'], at=hole, offset=(0, 0, .0030))
            a = Vector((hole - z * .009) * flip); b = Vector((hole + z * .002) * flip)
            bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.0032, depth=(b - a).length, location=(a + b) / 2)
            shaft = bpy.context.object
            shaft.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
            finish(shaft, f'screw_shaft_{label}_{tier}', mats['steel']); hardware.append(shaft)
        report.append({'tier': tier, 'bar_centre': B.round(4).tolist(), 'clip_reach_mm': round(reach * 1000, 2),
                       'bar_standoff_mm': round(float((B - H) @ N) * 1000, 2), 'cage_width_scale': round(float(sx[len(report)]), 3)})
    return [shell, mask] + hardware, report
