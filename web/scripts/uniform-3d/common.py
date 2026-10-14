import os, bpy, numpy as np
from pathlib import Path
from mathutils import Vector

HERE = Path(__file__).parent
SOURCES = Path(os.environ.get('UNIFORM_3D_SOURCES', Path.home() / 'Downloads'))   # the unpacked source model downloads
BUILD = HERE / 'build'

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

def material(name, color, roughness=.6, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metal
    return m

def finish(o, name, mat, smooth=True):
    o.name = name
    o.data.materials.clear()
    o.data.materials.append(mat)
    o.color = mat.diffuse_color
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o

def load_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    objects = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    for o in objects:
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = world
    select(objects)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for o in [o for o in bpy.data.objects if o not in before and o.type != 'MESH']:
        bpy.data.objects.remove(o)
    return objects

def verts(o):
    a = np.empty(len(o.data.vertices) * 3)
    o.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)

def set_verts(o, a):
    o.data.vertices.foreach_set('co', np.asarray(a, dtype=float).ravel())
    o.data.update()

def mesh_object(name, v, f):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(p) for p in v], [], [tuple(int(i) for i in p) for p in f])
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    return o

def fix_normals(o):
    select([o])
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

def setup_render(scene, engine='BLENDER_WORKBENCH', res=(1100, 1000)):
    scene.render.engine = engine
    scene.render.resolution_x, scene.render.resolution_y = res
    if engine == 'BLENDER_WORKBENCH':
        sh = scene.display.shading
        sh.light = 'STUDIO'; sh.show_cavity = True; sh.cavity_type = 'BOTH'
        sh.show_shadows = False; sh.color_type = 'OBJECT'
    else:
        scene.cycles.samples = 48; scene.cycles.use_denoising = True
        scene.world = bpy.data.worlds.new('Studio'); scene.world.use_nodes = True
        bg = scene.world.node_tree.nodes['Background']
        bg.inputs[0].default_value = (.65, .70, .78, 1); bg.inputs[1].default_value = .5
        for location, power, size in [((-1, -2, 2), 220, 2), ((2, 1, 1), 130, 2)]:
            bpy.ops.object.light_add(type='AREA', location=location)
            light = bpy.context.object
            light.data.energy = power; light.data.shape = 'DISK'; light.data.size = size
            light.rotation_euler = (Vector((0, 0, .3)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add()
    cam = bpy.context.object; cam.data.type = 'ORTHO'; scene.camera = cam
    return cam

def shot(scene, cam, path, target, direction, scale):
    target = Vector(target)
    cam.location = target + Vector(direction).normalized() * 3
    cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = scale
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
