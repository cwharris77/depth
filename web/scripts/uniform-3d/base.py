"""Builds the undressed base once: the CC-BY player posed hands on hips, the cloth-settled jersey, beltless pants, socks,
cleats and the clip-mounted SpeedFlex with the chinstrap re-seated on it. Every garment keeps one fixed UV layout, so a
kit is only textures painted into those layouts (see dress.py). Saves build/base.blend.

  Blender -b --python base.py"""
import sys, json, math, time, bpy, bmesh, numpy as np
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).parent))
from common import *
import helmet as helmet_build
from paint import box_uvs

SOURCE = SOURCES / 'american-football-player/source/3x.fbx'
HEIGHT, BODY_EASE, FRAMES, QUAD_GAIN, CURL = 1.86, .016, 60, .16, 70
STRAP_FACES = {32512, 8112, 6240, 6208, 4160, 3200}   # chin cup, straps and buckles among the helmet accessory islands
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(SOURCE))
scene = bpy.context.scene
arm = bpy.data.objects['Armature']; covers = bpy.data.objects['covers']; their_shell = bpy.data.objects['helmet_1']
scene.frame_set(1)
head = lambda: arm.matrix_world @ arm.pose.bones['mixamorig_Head'].matrix
rel = {o: head().inverted() @ o.matrix_world for o in (covers, their_shell)}
for o in bpy.data.objects: o.animation_data_clear()
for pb in arm.pose.bones: pb.matrix_basis = Matrix()
bpy.context.view_layer.update()
floor = min((o.matrix_world @ Vector(c)).z for o in bpy.data.objects if o.type == 'MESH' for c in o.bound_box)
top = max((bpy.data.objects['Body_2'].matrix_world @ Vector(c)).z for c in bpy.data.objects['Body_2'].bound_box)
K = HEIGHT / (top - floor)
def bake(name, new_name):
    src = bpy.data.objects[name] if isinstance(name, str) else name
    ev = src.evaluated_get(bpy.context.evaluated_depsgraph_get()); mesh = bpy.data.meshes.new_from_object(ev)
    mesh.transform(Matrix.Scale(K, 4) @ Matrix.Translation((0, 0, -floor)) @ ev.matrix_world)
    o = bpy.data.objects.new(new_name, mesh); bpy.context.collection.objects.link(o)
    return o
# Pose: hands on hips with the elbows a little back, feet a little wider than the rest stance.
A = arm.matrix_world.to_quaternion().to_matrix()
W = lambda p: arm.matrix_world @ p
def aim(name, d):
    pb = arm.pose.bones[name]; bpy.context.view_layer.update()
    cur = (W(pb.tail) - W(pb.head)).normalized()
    R = A.inverted() @ cur.rotation_difference(Vector(d).normalized()).to_matrix() @ A
    pb.matrix = Matrix.Translation(pb.head) @ R.to_4x4() @ Matrix.Translation(-pb.head) @ pb.matrix
    bpy.context.view_layer.update()
hip = W(arm.pose.bones['mixamorig_Hips'].head)
for side in ('Left', 'Right'):
    sx = 1 if W(arm.pose.bones[f'mixamorig_{side}Arm'].head).x > 0 else -1
    aim(f'mixamorig_{side}Arm', (sx * math.sin(math.radians(47)), .12, -math.cos(math.radians(47))))
    aim(f'mixamorig_{side}ForeArm', Vector((sx * .56, hip.y - .02, hip.z + .16)) - W(arm.pose.bones[f'mixamorig_{side}ForeArm'].head))
    aim(f'mixamorig_{side}Hand', (sx * .15, .35, -1))
    aim(f'mixamorig_{side}UpLeg', (sx * .10, 0, -1))
    for k in ('Index1', 'Index2', 'Index3', 'Thumb2', 'Thumb3'):   # curl the fingers into a loose fist
        pb = arm.pose.bones[f'mixamorig_{side}Hand{k}']; pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(CURL), 0, 0)
    bpy.context.view_layer.update()
for o, m in rel.items(): o.parent = None; o.matrix_world = head() @ m
bpy.context.view_layer.update()
select([covers]); bpy.ops.mesh.separate(type='LOOSE')
strap_parts = [o for o in bpy.data.objects if o.name.startswith('covers') and len(o.data.polygons) in STRAP_FACES]
select(strap_parts); bpy.ops.object.join(); strap_src = bpy.context.object

dg = bpy.context.evaluated_depsgraph_get()
floor = min((o.evaluated_get(dg).matrix_world @ v.co).z for o in (bpy.data.objects['shoes'],) for v in o.evaluated_get(dg).to_mesh().vertices)
to_final = lambda p: Vector(p * K) - Vector((0, 0, floor * K))
legs = [(to_final(W(arm.pose.bones[f'mixamorig_{s}UpLeg'].head)), to_final(W(arm.pose.bones[f'mixamorig_{s}Leg'].head))) for s in ('Left', 'Right')]
def group_weight(o, match):
    w = np.zeros(len(o.data.vertices))
    groups = {g.index for g in o.vertex_groups if match(g.name)}
    for v in o.data.vertices:
        w[v.index] = sum(g.weight for g in v.groups if g.group in groups)
    return np.clip(w, 0, 1)
thigh_w = {n: group_weight(bpy.data.objects[n], lambda g: 'UpLeg' in g) for n in ('Body_2', 'Body_3_2')}
hand_w = group_weight(bpy.data.objects['Body_2'], lambda g: 'ForeArm' in g or 'Hand' in g)
body, pants, shoes = bake('Body_2', 'mannequin'), bake('Body_3_2', 'pants'), bake('shoes', 'shoes')
garment, strap, shell_ref = bake('shirt', 'jersey_garment'), bake(strap_src, 'chinstrap'), bake(their_shell, 'shell_ref')
for o in list(bpy.data.objects):
    if o not in (body, pants, shoes, garment, strap, shell_ref): bpy.data.objects.remove(o)
# Heavier quads: thigh skin and the pants over it pushed out from each femur, most at mid-thigh and toward the front.
for o, w in ((body, thigh_w['Body_2']), (pants, thigh_w['Body_3_2'])):
    v = verts(o)
    for hipj, knee in legs:
        hj, kn = np.array(hipj), np.array(knee); axis = kn - hj; ln = np.linalg.norm(axis); axis /= ln
        t = (v - hj) @ axis / ln; foot = hj + np.outer(t, axis * ln); r = v - foot; rl = np.linalg.norm(r, axis=1)
        mine = (t > -.1) & (t < 1.05) & (rl < .16) & (np.sign(v[:, 0] - (legs[0][0].x + legs[1][0].x) / 2) == np.sign(hj[0] - (legs[0][0].x + legs[1][0].x) / 2))
        prof = np.clip(np.sin(np.pi * np.clip((t - .02) / .9, 0, 1)), 0, 1) ** .8
        front = np.clip(-r[:, 1] / np.maximum(rl, 1e-6), 0, 1)
        gain = QUAD_GAIN * w * prof * (.55 + .45 * front) * mine
        v += r * gain[:, None]
    set_verts(o, v)

# Material slots are roles; dress.py sets each role's colour and texture per kit.
# Named 'kit <role>' so they never collide with the source model's own material names.
mats = {k: material(f'kit {name}', col, *rest) for k, (name, col, *rest) in {
    'skin': ('skin', (.19, .22, .25)), 'cloth': ('jersey', (.5, .5, .5), .8), 'pants': ('pants', (.5, .5, .5), .6),
    'gear': ('socks', (.5, .5, .5), .8), 'shoe': ('cleats', (.85, .86, .88), .5), 'strap': ('chinstrap', (.88, .89, .90), .5),
    'shell': ('helmet', (.5, .5, .5), .38), 'mask': ('facemask', (.5, .5, .5), .55),
    'clip': ('facemask clips', (.12, .14, .18), .5), 'steel': ('screws', (.62, .64, .66), .3, .8)}.items()}
def recolor(o, pick):
    for i, slot in enumerate(o.material_slots): slot.material = pick(slot.material.name if slot.material else '', i)
    for p in o.data.polygons: p.use_smooth = True
recolor(body, lambda n, i: mats['skin'] if n.startswith('Bodymat') else mats['gear'])
# The source pants carry a belt in its own material slot; it is cut away so the jersey tucks straight into the waistband.
belt_slots = {i for i, s in enumerate(pants.material_slots) if not s.material.name.startswith('pants')}
bm = bmesh.new(); bm.from_mesh(pants.data)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in belt_slots], context='FACES')
bm.to_mesh(pants.data); bm.free()
recolor(pants, lambda n, i: mats['pants'])
recolor(shoes, lambda n, i: mats['shoe']); recolor(strap, lambda n, i: mats['strap']); recolor(garment, lambda n, i: mats['cloth'])

# ---- jersey: shoulders, sleeves, collar and tucked hem stay as sculpted; the body below the pads is given ease and simulated
bm = bmesh.new(); bm.from_mesh(garment.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=.002)   # panels are split along the UV seams; cloth needs them sewn
def boundary_loops(bm):
    seen, out = set(), []
    for e in [e for e in bm.edges if e.is_boundary]:
        if e in seen: continue
        loop, stack = [], [e]; seen.add(e)
        while stack:
            g = stack.pop(); loop.append(g)
            for q in g.verts:
                for h in q.link_edges:
                    if h.is_boundary and h not in seen: seen.add(h); stack.append(h)
        pts = np.array([q.co for g in loop for q in g.verts])
        sd = np.sqrt(np.maximum(np.linalg.eigvalsh(np.cov(pts.T)), 0)) if len(pts) > 3 else np.zeros(3)
        # a slit is narrow, or long and thin like an unsewn side seam; necks and cuffs are wide in two directions
        out.append((loop, sd[1] < .012 or (sd[1] < .03 and sd[2] > 2.5 * sd[1])))
    return out
# Seams whose two sides do not share vertices are left as slits, which are filled; a closing face joins two pattern pieces that sit far apart in the layout, so
# it takes one point of the layout and a single colour instead of smearing across the texture.
for loop, slit in boundary_loops(bm):
    if not slit: continue
    made = bmesh.ops.triangle_fill(bm, edges=loop, use_beauty=True)['geom']
    uvl = bm.loops.layers.uv.active
    new_faces = {g for g in made if isinstance(g, bmesh.types.BMFace)}
    for f in new_faces:
        other = next((m for l in f.loops for m in l.vert.link_loops if m.face not in new_faces), None)
        if other is not None:
            for l in f.loops: l[uvl].uv = other[uvl].uv
# The side seams below the armpits are open in the source sculpt (a lens-shaped gap closing to a V at the hem). Sew
# them: each open-edge vertex on a side is welded to the nearest open-edge vertex across the gap, skipping its own
# neighbours along the edge.
co_all = np.array([q.co for q in bm.verts]); zlo, zhi = co_all[:, 2].min(), co_all[:, 2].max(); xc = float(np.median(co_all[:, 0]))
body_half = np.percentile(np.abs(co_all[(co_all[:, 2] - zlo) / (zhi - zlo) < .5, 0] - xc), 99)
open_side = [q for q in bm.verts if q.is_boundary and (q.co.z - zlo) / (zhi - zlo) < .64 and abs(q.co.x - xc) > .6 * body_half]
# pattern pieces: faces joined across an edge whose UVs agree on both sides; a weld must join two different pieces
uvl = bm.loops.layers.uv.active; bm.faces.ensure_lookup_table(); parent = list(range(len(bm.faces)))
def root(i):
    while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
    return i
for e in bm.edges:
    if len(e.link_faces) != 2: continue
    la, lb = ([l for l in f.loops if l.vert in e.verts] for f in e.link_faces)
    uva = {l.vert: tuple(l[uvl].uv) for l in la}; uvb = {l.vert: tuple(l[uvl].uv) for l in lb}
    if all(np.allclose(uva[q], uvb[q], atol=1e-5) for q in e.verts): parent[root(e.link_faces[0].index)] = root(e.link_faces[1].index)
piece = {q: {root(f.index) for f in q.link_faces} for q in open_side}
weld, targets = {}, set()
for q in sorted(open_side, key=lambda q: q.co.z):
    if q in targets: continue
    best = min((o for o in open_side if not piece[o] & piece[q] and o not in weld and (o.co.x - xc) * (q.co.x - xc) > 0),
               key=lambda o: (o.co - q.co).length, default=None)
    if best is not None and (best.co - q.co).length < .06:
        mid = (best.co + q.co) / 2; best.co = mid; weld[q] = best; targets.add(best)
bmesh.ops.weld_verts(bm, targetmap=weld)
bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges[:])
print('SIDE_SEAMS sewn', len(weld))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
bm.to_mesh(garment.data); bm.free()
waist = float(verts(pants)[:, 2].max())
v = verts(garment); z0, z1 = v[:, 2].min(), v[:, 2].max(); zr = (v[:, 2] - z0) / (z1 - z0)
half = np.percentile(np.abs(v[zr < .5, 0]), 99)
free = np.clip((.66 - zr) / .10, 0, 1) * np.clip((v[:, 2] - waist - .004) / .04, 0, 1) * np.clip((half + .02 - np.abs(v[:, 0])) / .03, 0, 1)
g_free = garment.vertex_groups.new(name='free'); g_pin = garment.vertex_groups.new(name='pin')
for i, w in enumerate(free):
    if w > 0: g_free.add([i], float(w), 'REPLACE')
    if w < 1: g_pin.add([i], float(1 - w) ** 2, 'REPLACE')
m = garment.modifiers.new('relax', 'SMOOTH'); m.factor = .5; m.iterations = 25; m.vertex_group = 'free'
select([garment]); bpy.ops.object.modifier_apply(modifier=m.name)
v = verts(garment); cx, cy = v[free > .5, 0].mean(), v[free > .5, 1].mean()
r = np.hypot(v[:, 0] - cx, v[:, 1] - cy); grow = 1 + free * BODY_EASE / np.maximum(r, 1e-6)
v[:, 0] = cx + (v[:, 0] - cx) * grow; v[:, 1] = cy + (v[:, 1] - cy) * grow
set_verts(garment, v)
# The collider is the torso only: hands resting on the hips would otherwise bunch the jersey's sides into knots.
collider = body.copy(); collider.data = body.data.copy(); bpy.context.collection.objects.link(collider); collider.name = 'collider'
bm = bmesh.new(); bm.from_mesh(collider.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[bm.verts[i] for i in np.flatnonzero(hand_w > .3)], context='VERTS'); bm.to_mesh(collider.data); bm.free()
tree = BVHTree.FromPolygons([p.co for p in collider.data.vertices], [tuple(p.vertices) for p in collider.data.polygons])
def clear(o, gap, weights):
    for p in o.data.vertices:
        if weights[p.index] <= 0: continue
        loc, normal, index, dist = tree.find_nearest(p.co)
        if (p.co - loc).dot(normal) < gap: p.co = loc + normal * gap
clear(garment, .004, free)
# Artwork is painted on this relaxed, eased shape (kept as the 'rest' attribute); later steps only drape it.
rest = garment.data.attributes.new('rest', 'FLOAT_VECTOR', 'POINT'); rest.data.foreach_set('vector', verts(garment).ravel())
collider.modifiers.new('Collision', 'COLLISION')
collider.collision.thickness_outer = .003; collider.collision.thickness_inner = .02; collider.collision.cloth_friction = 10
cloth = garment.modifiers.new('Cloth', 'CLOTH'); cs, cc = cloth.settings, cloth.collision_settings
cs.quality = 12; cs.mass = .15; cs.air_damping = 3
cs.tension_stiffness = cs.compression_stiffness = 25; cs.shear_stiffness = 10; cs.bending_stiffness = 6
cs.tension_damping = cs.compression_damping = cs.shear_damping = 8; cs.bending_damping = 1
cs.vertex_group_mass = 'pin'; cs.pin_stiffness = 1
cc.use_collision = True; cc.collision_quality = 4; cc.distance_min = .0015
cc.use_self_collision = True; cc.self_distance_min = .002; cc.self_friction = 5
scene.frame_start, scene.frame_end = 1, FRAMES
cloth.point_cache.frame_start, cloth.point_cache.frame_end = 1, FRAMES
t0 = time.time()
for f in range(1, FRAMES + 1):
    scene.frame_set(f)
    if f % 20 == 0: print('FRAME', f, round(time.time() - t0), flush=True)
settled = verts(garment.evaluated_get(bpy.context.evaluated_depsgraph_get())).copy()
garment.modifiers.remove(cloth); scene.frame_set(1)
set_verts(garment, settled)
# Smooth out the fine solver ripples and the creases left along the closed side seams.
m = garment.modifiers.new('soften', 'SMOOTH'); m.factor = .6; m.iterations = 12; m.vertex_group = 'free'
select([garment]); bpy.ops.object.modifier_apply(modifier=m.name)
clear(garment, .002, free)
bpy.data.objects.remove(collider)
for n in ('free', 'pin'): garment.vertex_groups.remove(garment.vertex_groups[n])

# ---- helmet: the SpeedFlex shell, facemask and clips, placed where the source helmet sat, wearing the source chinstrap
bounds = lambda objs: (np.min([verts(o).min(0) for o in objs], 0), np.max([verts(o).max(0) for o in objs], 0))
helmet, mount_report = helmet_build.build(BUILD, mats)
ours = [o for o in helmet if o.name == helmet[0].name]
(alo, ahi), (blo, bhi) = bounds(ours), bounds([shell_ref])
fit = float(np.mean((bhi - blo)[[0, 2]] / (ahi - alo)[[0, 2]]))
offset = (blo + bhi) / 2 - (alo + ahi) / 2
for o in helmet: o.location = Vector(offset)
select(helmet); bpy.ops.object.transform_apply(location=True)
# the strap follows the shell: scaled about the source shell centre by the size difference between the two shells
sv = verts(strap); c = (blo + bhi) / 2; set_verts(strap, c + (sv - c) / fit)
bpy.data.objects.remove(shell_ref)
# Re-seat the strap on this shell: past the chin cup, strap runs lie on the shell's outer surface, and tails that
# would hang off the back edge are trimmed, so each strap ends on the shell side as it would at its snap.
shell = helmet[0]
stree = BVHTree.FromPolygons([v.co.copy() for v in shell.data.vertices], [tuple(p.vertices) for p in shell.data.polygons])
sv = verts(strap); cup = sv[sv[:, 1] < np.percentile(sv[:, 1], 6)].mean(0)
dist_cup = np.linalg.norm(sv - cup, axis=1)
gap = np.array([(Vector(p) - stree.find_nearest(Vector(p))[0]).length for p in sv])
w = np.clip((dist_cup - .07) / .05, 0, 1)
for i, p in enumerate(sv):
    if w[i] <= 0: continue
    loc, nrm, idx, d = stree.find_nearest(Vector(p))
    sv[i] = np.array(p) * (1 - w[i]) + np.array(loc + nrm * .0025) * w[i]
set_verts(strap, sv)
bm = bmesh.new(); bm.from_mesh(strap.data); bm.verts.ensure_lookup_table()
behind = float(verts(shell)[:, 1].max()) - .035
drop = [v for v in bm.verts if dist_cup[v.index] > .1 and (gap[v.index] > .03 or v.co.y > behind)]
bmesh.ops.delete(bm, geom=drop, context='VERTS'); bm.to_mesh(strap.data); bm.free()
box_uvs(shell)
helmet = helmet + [strap]

# The pants carry three UV sets; only the last is a clean, non-overlapping layout for the leg panels.
for layer in [l for l in pants.data.uv_layers if l.name != 'UVW.001']: pants.data.uv_layers.remove(layer)
pants.data.uv_layers.active = pants.data.uv_layers['UVW.001']; pants.data.uv_layers['UVW.001'].active_render = True

# Socks for the floating variant: the mannequin's sock and sleeve surfaces without its skin or anything above the knee.
socks = body.copy(); socks.data = body.data.copy(); bpy.context.collection.objects.link(socks); socks.name = 'socks'
bm = bmesh.new(); bm.from_mesh(socks.data)
skin_slots = {i for i, m in enumerate(socks.data.materials) if m is mats['skin']}
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in skin_slots or f.calc_center_median().z > .6], context='FACES')
bm.to_mesh(socks.data); bm.free()

garment['set'] = 'jersey'
for o in (body, pants, shoes): o['set'] = 'base'
for o in helmet: o['set'] = 'helmet'
socks['set'] = 'floating'
garment['legs'] = [float(x) for leg in legs for p in leg for x in p]
tris = lambda objs: sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
for im in [i for i in bpy.data.images if i.source == 'FILE' and not Path(bpy.path.abspath(i.filepath)).exists()]:
    bpy.data.images.remove(im)   # the source model's leftover texture references
bpy.ops.wm.save_as_mainfile(filepath=str(BUILD / 'base.blend'))
(BUILD / 'base.json').write_text(json.dumps({'mounts': mount_report, 'triangles': {'jersey': tris([garment]), 'body_pants_shoes': tris([body, pants, shoes]),
                                            'helmet_with_chinstrap': tris(helmet)}, 'scale_to_metres': round(K, 5), 'helmet_fit_scale': round(fit, 3)}, indent=2))
print('BASE_COMPLETE')
