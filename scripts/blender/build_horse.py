# -*- coding: utf-8 -*-
# 御艺马匹重做: Blender 5.2 headless
# 契约: 网格名 leg_0..3(髋枢轴) + knee_0..3(膝枢轴) + 深色件名含 mane/tail/hoof/forelock
# 朝向: 马头朝 Blender +Y (导出 glTF 后 = -Z, 与轺车行进方向一致); 蹄底 y=0; 肩高约 1.55
# 用法: blender.exe --background --python build_horse.py
import bpy, math

# ---------- 清场 ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

def mat(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    return m

COAT = mat('coat', (0.42, 0.27, 0.16))
DARK = mat('dark', (0.10, 0.07, 0.05))

def sph(name, loc, scale, m, segs=(32, 20)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs[0], ring_count=segs[1],
                                         radius=1, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    o.data.materials.append(m)
    return o

def cone(name, loc, r_bottom, r_top, depth, rot, m, segs=16):
    bpy.ops.mesh.primitive_cone_add(vertices=segs, radius1=r_bottom, radius2=r_top,
                                    depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    return o

def origin_to(o, loc):
    bpy.context.scene.cursor.location = loc
    for ob in bpy.context.selected_objects:
        ob.select_set(False)
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

def smooth(o, angle=math.radians(50)):
    for p in o.data.polygons:
        p.use_smooth = True
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    if hasattr(bpy.ops.object, 'shade_auto_smooth'):
        bpy.ops.object.shade_auto_smooth(angle=angle)

D = math.radians

# ---------- 躯干(合并为一件 body, 光滑剪影) ----------
parts = [
    sph('p_barrel', (0, 0.02, 1.13), (0.40, 0.62, 0.43), COAT),
    sph('p_chest', (0, -0.48, 1.10), (0.35, 0.30, 0.41), COAT),
    sph('p_rump', (0, 0.50, 1.14), (0.34, 0.34, 0.41), COAT),
    sph('p_withers', (0, -0.16, 1.40), (0.30, 0.22, 0.18), COAT),
]
bpy.ops.object.select_all(action='DESELECT')
for p in parts:
    p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'body'
smooth(body)

# ---------- 颈·头·耳·眼·口鼻 ----------
neck = cone('neck', (0, 0.41, 1.54), 0.20, 0.135, 0.78, (D(-52), 0, 0), COAT, 20)
smooth(neck)  # 底在胸、顶伸向 +Y 上方
head = sph('head', (0, 0.92, 1.80), (0.145, 0.30, 0.185), COAT, (24, 16))
head.rotation_euler = (D(-18), 0, 0)
smooth(head)
muzzle = sph('muzzle', (0, 1.14, 1.70), (0.095, 0.15, 0.115), COAT, (20, 12))
smooth(muzzle)
ear0 = cone('ear0', (0.075, 0.82, 1.98), 0.001, 0.045, 0.15, (D(-8), 0, D(6)), DARK, 10)
ear1 = cone('ear1', (-0.075, 0.82, 1.98), 0.001, 0.045, 0.15, (D(-8), 0, D(-6)), DARK, 10)
eye0 = sph('mane_eye0', (0.12, 0.86, 1.82), (0.032, 0.032, 0.032), DARK, (12, 8))
eye1 = sph('mane_eye1', (-0.12, 0.86, 1.82), (0.032, 0.032, 0.032), DARK, (12, 8))
forelock = sph('forelock', (0, 1.00, 1.90), (0.06, 0.11, 0.07), DARK, (14, 10))
smooth(forelock)

# ---------- 鬃(颈脊一列)·尾 ----------
mane_pos = [(0, 0.28, 1.50, 0.06, 0.20, 0.12), (0, 0.42, 1.58, 0.055, 0.20, 0.115),
            (0, 0.55, 1.66, 0.05, 0.19, 0.105), (0, 0.67, 1.73, 0.045, 0.17, 0.095), (0, 0.76, 1.78, 0.04, 0.15, 0.085)]
for i, (x, y, z, sx, sy, sz) in enumerate(mane_pos):
    m = sph('mane%d' % i, (x, y, z), (sx, sy, sz), DARK, (14, 10))
    smooth(m)
tail1 = cone('tail', (0, -0.82, 1.18), 0.075, 0.045, 0.42, (D(152), 0, 0), DARK, 12)
smooth(tail1)
tail2 = cone('tail2', (0, -0.953, 0.829), 0.043, 0.02, 0.34, (D(168), 0, 0), DARK, 10)
smooth(tail2)

# ---------- 四肢: leg_N(髋) + knee_N(膝) + hoof_N ----------
# 快步对角同步: leg_0=左前(phase0) leg_1=右前(phaseπ) leg_3=左后(phaseπ) leg_2=右后(phase0)
LEGS = [
    ('leg_0', 'knee_0', 'hoof_0', 0.235, 0.46, 1.06),   # 左前
    ('leg_1', 'knee_1', 'hoof_1', -0.235, 0.46, 1.06),  # 右前
    ('leg_2', 'knee_2', 'hoof_2', -0.24, -0.52, 1.08),  # 右后
    ('leg_3', 'knee_3', 'hoof_3', 0.24, -0.52, 1.08),   # 左后
]
for leg, knee, hoof, x, y, hip_z in LEGS:
    front = y > 0
    upper_r_top, upper_r_bot = (0.125, 0.085) if front else (0.145, 0.095)
    upper = cone(leg, (x, y, hip_z - 0.26), upper_r_bot, upper_r_top, 0.52, (0, 0, 0), COAT, 14)
    origin_to(upper, (x, y, hip_z))
    smooth(upper)
    knee_z = hip_z - 0.52
    lower = cone(knee, (x, y, knee_z - 0.20), 0.052, 0.078, 0.40, (0, 0, 0), COAT, 12)
    origin_to(lower, (x, y, knee_z))
    smooth(lower)
    hoof_z = knee_z - 0.42
    h = cone(hoof, (x, y, hoof_z - 0.045), 0.062, 0.075, 0.10, (0, 0, 0), DARK, 12)
    origin_to(h, (x, y, hoof_z))
    # 父子: knee→leg, hoof→knee (保持变换)
    lower.parent = upper
    lower.matrix_parent_inverse = upper.matrix_world.inverted()
    h.parent = lower
    h.matrix_parent_inverse = lower.matrix_world.inverted()

# ---------- 轭具(背垫/肚带/后鞦, 中性色由场景上色) ----------
pad = sph('saddle', (0, -0.10, 1.47), (0.24, 0.26, 0.09), COAT, (18, 12))
girth = cone('girth', (0, 0.02, 1.05), 0.44, 0.44, 0.10, (D(90), 0, 0), COAT, 18)
breech = cone('breech', (0, 0.44, 1.10), 0.40, 0.40, 0.09, (D(90), 0, 0), COAT, 18)
smooth(pad)

# ---------- 预览: 相机 + 太阳 + EEVEE 渲染 ----------
cam_data = bpy.data.cameras.new('cam')
cam = bpy.data.objects.new('cam', cam_data)
S.collection.objects.link(cam)
cam.location = (2.7, -3.8, 1.55)
tgt = bpy.data.objects.new('cam_tgt', None)
S.collection.objects.link(tgt)
tgt.location = (0, 0, 0.95)
tc = cam.constraints.new('TRACK_TO')
tc.target = tgt
S.camera = cam
sun_data = bpy.data.lights.new('sun', 'SUN')
sun_data.energy = 3.5
sun_data.angle = D(30)
sun = bpy.data.objects.new('sun', sun_data)
S.collection.objects.link(sun)
sun.rotation_euler = (D(50), 0, D(-35))
w = bpy.data.worlds.new('w')
w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.86, 0.88, 0.92, 1)
w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
S.world = w
S.render.engine = 'BLENDER_EEVEE' if 'BLENDER_EEVEE' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE_NEXT'
S.render.resolution_x = 960
S.render.resolution_y = 540
S.render.filepath = r'D:/d/i18n_audit/horse_preview.png'
bpy.ops.render.render(write_still=True)
cam.location = (4.6, 0.3, 1.3)
S.render.filepath = r'D:/d/i18n_audit/horse_side.png'
bpy.ops.render.render(write_still=True)

# ---------- 导出 GLB(移除预览辅助对象) ----------
bpy.ops.object.select_all(action='DESELECT')
for helper in ('cam_tgt', 'cam', 'sun'):
    ob = bpy.data.objects.get(helper)
    if ob:
        ob.select_set(True)
bpy.ops.object.delete()
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(
    filepath=r'D:/d/designkongzi (2)/designkongzi/frontend/public/models/sixarts/horse.glb',
    export_format='GLB',
    export_apply=False,
    export_yup=True,
    export_animations=False,
    export_extras=True,
)
print('HORSE BUILD DONE')
