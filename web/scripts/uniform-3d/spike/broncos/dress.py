"""Dresses the base in one kit: paints the kit spec into the base's UV layouts, sets the finishes, renders the review
views and exports the floating GLB into build/out/<kit id>/.

  Blender -b --python dress.py -- kits/<kit>.json [--final]   (Workbench previews by default; --final renders Cycles
                                                               and also exports a GLB and packed .blend)"""
import json, sys, bpy, numpy as np
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from common import HERE, BUILD, setup_render, shot, verts
from floating_layout import offsets
import paint
from validate_kit import validate_kit

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
FINAL = '--final' in args
kit = validate_kit(HERE / next(a for a in args if a.endswith('.json')))
pal = paint.palette(kit)
OUT = BUILD / 'out' / kit['id']; TMP = OUT / 'tmp'; TMP.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(BUILD / 'base.blend'))
scene = bpy.context.scene
obj = bpy.data.objects
jersey, pants, shell = obj['jersey_garment'], obj['pants'], obj['helmet_shell']
legs = np.array(jersey['legs']).reshape(2, 2, 3)

lin = lambda key: tuple(float(((c + .055) / 1.055) ** 2.4) for c in paint.rgb(pal, key))
def textured(mat, image):
    nt = mat.node_tree; tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = image
    nt.links.new(tx.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])
def flat(mat, key):
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin(key), 1); mat.diffuse_color = (*lin(key), 1)
def fabric(mat, normal, scale, roughness, sheen, strength):
    """Knit fabric: a soft sheen over a rough base, with a tiling knit normal map."""
    nt = mat.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = roughness; b.inputs['Specular IOR Level'].default_value = .3
    b.inputs['Sheen Weight'].default_value = sheen; b.inputs['Sheen Roughness'].default_value = .35
    tc, mp = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (*scale, 1)
    tx, nm = nt.nodes.new('ShaderNodeTexImage'), nt.nodes.new('ShaderNodeNormalMap'); tx.image = normal; nm.inputs['Strength'].default_value = strength
    nt.links.new(tc.outputs['UV'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], tx.inputs['Vector'])
    nt.links.new(tx.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])

M = {m.name[4:]: m for m in bpy.data.materials if m.name.startswith('kit ')}
jersey_tex, jersey_report = paint.paint_jersey(jersey, kit, pal, TMP, OUT / 'jersey.png')
pants_tex = paint.paint_pants(pants, kit, pal, legs, OUT / 'pants.png')
helmet_tex, helmet_report = paint.paint_helmet(shell, kit, pal, TMP, OUT / 'helmet.png')
textured(M['jersey'], jersey_tex); textured(M['pants'], pants_tex); textured(M['helmet'], helmet_tex)
flat(M['socks'], kit['socks']['color']); flat(M['facemask'], kit['helmet']['facemask'])
if FINAL:   # Workbench previews show a material's first image node, so the knit maps go on only for final renders
    jersey_knit = paint.knit_normal(TMP / 'jersey-knit-normal.png', 'jersey'); pants_knit = paint.knit_normal(TMP / 'pants-knit-normal.png', 'pants')
    fabric(M['jersey'], jersey_knit, (52, 23), .82, .3, .35); fabric(M['socks'], pants_knit, (40, 40), .8, .25, .25)
    fabric(M['pants'], pants_knit, (40, 40), .6, .2, .25)
hb = M['helmet'].node_tree.nodes['Principled BSDF']   # a clear coat over a satin base
hb.inputs['Roughness'].default_value = .38; hb.inputs['Coat Weight'].default_value = .7; hb.inputs['Coat Roughness'].default_value = .14
print('REPORT', json.dumps({'jersey': jersey_report, 'helmet': helmet_report}))

if 'mannequin' in obj:
    obj.remove(obj['mannequin'], do_unlink=True)
sets = {s: [o for o in obj if o.get('set') == s] for s in ('jersey', 'base', 'helmet', 'floating')}
floating = sets['jersey'] + sets['base'] + sets['floating'] + sets['helmet']
if 'floating_layout' in kit:
    def z_bounds(o):
        z = verts(o)[:, 2] + o.location.z
        return float(z.min()), float(z.max())
    b = {key: z_bounds(o) for key, o in (('jersey', jersey), ('pants', pants), ('socks', obj['socks']), ('helmet', shell))}
    dz = offsets(b, kit['floating_layout'])
    pants.location.z += dz['pants']
    for name in ('socks', 'shoes.001'):
        obj[name].location.z += dz['socks']
    for o in sets['helmet']:
        o.location.z += dz['helmet']
for o in list(obj):
    if o.type in ('CAMERA', 'LIGHT'): obj.remove(o)
cam = setup_render(scene, 'CYCLES' if FINAL else 'BLENDER_WORKBENCH', (900, 1000))
scene.view_settings.view_transform = 'Standard'
if FINAL: scene.view_settings.exposure = -.35
else: scene.display.shading.color_type = 'TEXTURE'
scene.world = scene.world or bpy.data.worlds.new('Studio'); scene.world.color = (.25, .27, .3)
shown = floating
def view(name, visible, target, scale, direction):
    for o in shown: o.hide_render = o not in visible
    shot(scene, cam, OUT / f'{name}.png', target, direction, scale)
bounds = lambda objs: (np.min([(verts(o) + np.array(o.location)).min(0) for o in objs], 0), np.max([(verts(o) + np.array(o.location)).max(0) for o in objs], 0))
(glo, ghi), (hlo, hhi) = bounds(sets['jersey']), bounds(sets['helmet'][:1])
up = (0, 0, float((glo[2] + hhi[2]) / 2) - .04); span = float(hhi[2] - glo[2]) * 1.12; hc = tuple(float(x) for x in (hlo + hhi) / 2)
xs = float(ghi[0]); sh = float(ghi[2]) - .12
view('jersey-front', floating, up, span, (0, -1, .08))
view('jersey-back', floating, up, span, (0, 1, .08))
view('jersey-threequarter', floating, up, span, (.6, -1, .15))
view('jersey-back-threequarter', floating, up, span, (-.45, 1, .15))
for s, nm in ((1, 'left'), (-1, 'right')):
    view(f'jersey-side-{nm}', floating, up, span, (s, 0, .05))
    view(f'sleeve-{nm}', sets['jersey'], (s * (xs - .1), 0, sh), .42, (s, -.25, .15))
view('helmet-front', sets['helmet'], hc, .38, (0, -1, .05))
view('helmet-side', sets['helmet'], hc, .36, (1, 0, .02))
view('helmet-back', sets['helmet'], hc, .38, (-.5, 1, .1))
H = 1.86
view('floating-front', floating, (0, 0, H * .52), H * 1.12, (0, -1, .08))
view('floating-side', floating, (0, 0, H * .52), H * 1.12, (1, 0, .05))
view('floating-threequarter', floating, (0, 0, H * .52), H * 1.12, (.5, -1, .18))
view('floating-back', floating, (0, 0, H * .52), H * 1.12, (-.5, 1, .12))
for o in shown: o.hide_render = False
if FINAL:
    def export(name, objects):
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=str(OUT / f'{name}.glb'), use_selection=True, export_image_format='JPEG')
    export('uniform-floating', floating)
    (OUT / 'uniform-equipped.glb').unlink(missing_ok=True)
    bpy.ops.file.pack_all(); bpy.ops.wm.save_as_mainfile(filepath=str(OUT / f'{kit["id"]}.blend'))
    for o, name in ((jersey, 'jersey'), (pants, 'pants'), (shell, 'helmet')): paint.uv_layout(o, OUT / f'{name}.png', OUT / f'uv-layout-{name}.png')
print('DRESS_COMPLETE', kit['id'])
