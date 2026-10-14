"""Fuses the assembled print sections into one continuous shell (voxel remesh, a light relax, then decimation) and keeps
the facemask as its own object. Reads build/speedflex.glb, writes build/speedflex-fused.glb for base.py.

  Blender -b --python fuse_helmet.py"""
import sys, bpy, bmesh
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import BUILD, select, load_glb

def apply(o, modifier):
    select([o]); bpy.ops.object.modifier_apply(modifier=modifier.name)
    o.data.validate(); o.data.update()

bpy.ops.wm.read_factory_settings(use_empty=True)
helmet = load_glb(BUILD / 'speedflex.glb')
mask = next(o for o in helmet if o.name.startswith('facemask'))
select([o for o in helmet if o.name.startswith('shell_')]); bpy.ops.object.join()
shell = bpy.context.object; shell.name = 'continuous_shell'
remesh = shell.modifiers.new('Fuse print sections', 'REMESH'); remesh.mode = 'VOXEL'; remesh.voxel_size = .00065; remesh.use_smooth_shade = True
apply(shell, remesh)
relax = shell.modifiers.new('Relax voxel surface', 'SMOOTH'); relax.factor = .35; relax.iterations = 3
apply(shell, relax)
reduce = shell.modifiers.new('Surface budget', 'DECIMATE'); reduce.ratio = .15; reduce.use_collapse_triangulate = True
apply(shell, reduce)
bm = bmesh.new(); bm.from_mesh(shell.data)
unvisited = set(bm.verts)   # drop the remesher's stray slivers (components under 20 vertices)
while unvisited:
    seed = unvisited.pop(); component, pending = {seed}, [seed]
    while pending:
        v = pending.pop()
        for e in v.link_edges:
            other = e.other_vert(v)
            if other in unvisited: unvisited.remove(other); component.add(other); pending.append(other)
    if len(component) < 20: bmesh.ops.delete(bm, geom=list(component), context='VERTS')
bmesh.ops.dissolve_degenerate(bm, dist=1e-8, edges=list(bm.edges))
boundary = [e for e in bm.edges if e.is_boundary]
if boundary: bmesh.ops.holes_fill(bm, edges=boundary, sides=8)
bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
bm.to_mesh(shell.data); bm.free(); shell.data.validate()
for o in (shell, mask):
    for p in o.data.polygons: p.use_smooth = True
select([shell, mask]); bpy.ops.export_scene.gltf(filepath=str(BUILD / 'speedflex-fused.glb'), use_selection=True)
print('FUSED', {o.name: len(o.data.polygons) for o in (shell, mask)})
