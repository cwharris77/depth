"""Assembles the SpeedFlex replica's shell sections from their print-bed layout into one helmet, plus the facemask.
Writes build/speedflex.glb (metres, z up, facing -y), the input to fuse_helmet.py.

The sections were laid out flat for printing, so each one is registered onto its neighbour by matching the congruent
planar cut faces they share (rigid ICP, no scaling). STL units are millimetres.

  python3 assemble_helmet.py      (needs numpy, scipy, trimesh and networkx; not Blender's Python)"""
import os
from pathlib import Path
import numpy as np, trimesh
from scipy.spatial import cKDTree

HERE = Path(__file__).parent
SRC = Path(os.environ.get('UNIFORM_3D_SOURCES', Path.home() / 'Downloads')) / 'Speedflex+decon+shell_stls'
BUILD = HERE / 'build'
SHELL, MASK = [16, 17, 18, 41, 42, 55, 56], 27   # obj_<n>_* source files
meshes = {i: trimesh.load(next(SRC.glob(f'obj_{i}_*'))) for i in SHELL + [MASK]}

def fit(a, na, b, nb):
    """Rigid transform taking cut face a (normal na) onto cut face b (normal nb), trying both in-plane flips."""
    ca, cb = a.mean(0), b.mean(0)
    ua, ub = np.linalg.svd(a - ca)[2][0], np.linalg.svd(b - cb)[2][0]
    A = np.column_stack([ua, np.cross(na, ua), na]); best = None
    for sign in (-1, 1):
        u, normal = ub * sign, -nb
        B = np.column_stack([u, np.cross(normal, u), normal])
        T = np.eye(4); T[:3, :3] = B @ A.T; T[:3, 3] = cb - T[:3, :3] @ ca
        T, _, _ = trimesh.registration.icp(a, b, initial=T, max_iterations=100, threshold=1e-10, scale=False, reflection=False)
        moved = trimesh.transform_points(a, T)
        error = np.mean(cKDTree(b).query(moved)[0] ** 2) + np.mean(cKDTree(moved).query(b)[0] ** 2)
        if best is None or error < best[0]: best = (error, T)
    return best

def group(m, axis, sign):
    """Vertices of the largest planar face pointing along +-axis, plus the coplanar faces beside it."""
    ids = np.where(m.facets_normal[:, axis] * sign > .999)[0]
    largest = ids[np.argmax(m.facets_area[ids])]
    origin = m.facets_origin[largest, axis]
    ids = [j for j in ids if abs(m.facets_origin[j, axis] - origin) < .2]
    return m.vertices[np.unique(np.concatenate([m.faces[m.facets[j]].ravel() for j in ids]))], m.facets_normal[largest]

def combined(ids, axis, sign, transforms):
    points, normal = [], None
    for i in ids:
        p, n = group(meshes[i], axis, sign)
        points.append(trimesh.transform_points(p, transforms[i])); normal = transforms[i][:3, :3] @ n
    return np.vstack(points), normal

errors = []
Ts = {17: np.eye(4), 41: np.eye(4)}
for source, target in [(42, 17), (18, 41)]:   # crown caps onto their side pieces
    a, na = group(meshes[source], 2, -1); b, nb = group(meshes[target], 2, -1)
    err, Ts[source] = fit(a, na, b, nb); errors.append(err)
for source, sign, targets, axis, t_sign in [(55, 1, [17, 42], 0, -1), (56, -1, [41, 18], 0, 1)]:   # centre bands
    a, na = group(meshes[source], 2, sign); b, nb = combined(targets, axis, t_sign, Ts)
    err, Ts[source] = fit(a, na, b, nb); errors.append(err)
a, na = combined([56], 2, 1, Ts); b, nb = combined([55], 2, -1, Ts)   # left half onto right half
err, T = fit(a, na, b, nb); errors.append(err)
for i in (41, 18, 56): Ts[i] = T @ Ts[i]
a, na = combined([42, 18], 2, 1, Ts)   # lower section onto the assembled upper shell's bottom cut
plane = np.median(a @ na); points = []
for i in (17, 42, 41, 18, 55, 56):
    m = meshes[i].copy(); m.apply_transform(Ts[i])
    ids = np.where((m.facets_normal @ na > .999) & (abs(m.facets_origin @ na - plane) < .3))[0]
    if len(ids): points.append(m.vertices[np.unique(np.concatenate([m.faces[m.facets[j]].ravel() for j in ids]))])
b, nb = group(meshes[16], 2, -1)
err, T = fit(np.vstack(points), na, b, nb); Ts[16] = np.linalg.inv(T); errors.append(err)

scene = trimesh.Scene()
for i, T in Ts.items():
    m = meshes[i].copy(); m.apply_transform(T); scene.add_geometry(m, geom_name=f'shell_{i}')
bounds = scene.bounds
mask = meshes[MASK].copy()   # stood upright and placed by eye; helmet.py seats it on the screw holes
mask.apply_transform(trimesh.transformations.rotation_matrix(np.pi / 2, [1, 0, 0]))
mask.apply_translation([(bounds[0, 0] + bounds[1, 0]) / 2 - mask.bounds.mean(0)[0], bounds[0, 1] + 70 - mask.bounds[1, 1],
                        bounds[1, 2] - 110 - mask.bounds[1, 2]])
scene.add_geometry(mask, geom_name='facemask')
centre, rotation = scene.bounds.mean(0), trimesh.transformations.rotation_matrix(-np.pi / 2, [1, 0, 0])
for m in scene.geometry.values():
    m.apply_translation(-centre); m.apply_transform(rotation); m.apply_scale(.001)
BUILD.mkdir(exist_ok=True)
scene.export(BUILD / 'speedflex.glb')
print('ASSEMBLED join RMS mm', [round(float(np.sqrt(e / 2)), 3) for e in errors])
