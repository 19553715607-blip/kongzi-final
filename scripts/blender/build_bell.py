# -*- coding: utf-8 -*-
# 曾侯乙式甬钟建模: 合瓦形截面(0.62扁率) + 曲于口 + 空心壁厚(solidify) + 甬/旋/衡 + 三圈枚 + 篆带
# 契约: 材质名 bronze_body(钟身, three.js 覆写皮)/bronze_deep(配件深铜)
# 朝向: Blender Z-up, 钟口 z=0, 顶 z=1.40, 衡顶 z≈1.72; glTF 导出自动转 Y-up
# 用法: blender.exe --background --python build_bell.py
import bpy, bmesh, math

OUT = r'D:/d/designkongzi (2)/designkongzi/frontend/public/models/sixarts/bianzhong.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

SEGS = 40
SQ = 0.62  # 合瓦扁率(y 向压扁)
# 近直壁上收轮廓: (半径, z); 铣角(口沿)最宽, 肩上收
PROFILE = [
    (0.42, 0.0), (0.418, 0.04), (0.40, 0.20), (0.375, 0.55),
    (0.35, 0.90), (0.325, 1.15), (0.30, 1.32), (0.27, 1.38), (0.115, 1.395),
]

def rim_lift(z, th):
    """曲于口: 口沿前后中央上弧、两侧铣角最低"""
    if z >= 0.18:
        return 0.0
    return 0.09 * (math.sin(th) ** 2) * ((1 - z / 0.18) ** 2)

# ---------- 钟身 ----------
bm = bmesh.new()
rings = []
for (r, z) in PROFILE:
    ring = []
    for j in range(SEGS):
        th = 2 * math.pi * j / SEGS
        ring.append(bm.verts.new((r * math.cos(th), r * math.sin(th) * SQ, z + rim_lift(z, th))))
    rings.append(ring)
for i in range(len(rings) - 1):
    for j in range(SEGS):
        j2 = (j + 1) % SEGS
        bm.faces.new((rings[i][j], rings[i][j2], rings[i + 1][j2], rings[i + 1][j]))
top = bm.verts.new((0, 0, 1.40))
lastr = rings[-1]
for j in range(SEGS):
    j2 = (j + 1) % SEGS
    bm.faces.new((lastr[j], lastr[j2], top))
bm.normal_update()
me = bpy.data.meshes.new("bellbody")
bm.to_mesh(me)
bm.free()
me.uv_layers.new(name="UVMap")
ob = bpy.data.objects.new("bellbody", me)
S.collection.objects.link(ob)
bpy.context.view_layer.objects.active = ob

# 空心壁厚(口沿见壁)
sol = ob.modifiers.new("sol", 'SOLIDIFY')
sol.thickness = 0.028
sol.offset = -1
sol.use_rim = True
bpy.ops.object.modifier_apply(modifier="sol")

# 圆柱 UV(铭文带按 v 高度铺)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.shade_smooth()
try:
    bpy.ops.object.shade_auto_smooth(angle=0.5)
except Exception:
    pass

# ---------- 材质 ----------
def mat(name, color, rough=0.55, metal=0.75):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    return m

BODY = mat('bronze_body', (0.49, 0.53, 0.40))
DEEP = mat('bronze_deep', (0.27, 0.30, 0.21), rough=0.6)
me.materials.append(BODY)

def prim(name, op, m, **kw):
    op(**kw)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    o.name = name
    return o

# ---------- 甬/旋/衡 ----------
prim('yong', bpy.ops.mesh.primitive_cone_add, DEEP,
     vertices=24, radius1=0.065, radius2=0.052, depth=0.30, location=(0, 0, 1.55))
xuan = prim('xuan', bpy.ops.mesh.primitive_torus_add, DEEP,
            major_radius=0.075, minor_radius=0.018, major_segments=32, minor_segments=8, location=(0, 0, 1.50))
xuan.scale = (1, SQ, 1)
prim('heng', bpy.ops.mesh.primitive_uv_sphere_add, DEEP,
     radius=0.045, segments=12, ring_count=8, location=(0, 0, 1.72))

# ---------- 枚(三圈九钉, 贴合近直壁弧度) ----------
ROWS = [(0.72, 0.375), (0.92, 0.36), (1.12, 0.341)]
for ri, (z, r) in enumerate(ROWS):
    for k in range(9):
        th = 2 * math.pi * k / 9
        loc = (r * math.cos(th), r * math.sin(th) * SQ, z)
        prim(f'mei_{ri}_{k}', bpy.ops.mesh.primitive_uv_sphere_add, DEEP,
             radius=0.028, segments=12, ring_count=8, location=loc)

# ---------- 篆带(枚行间装饰箍) ----------
for i, (z, r) in enumerate([(0.82, 0.368), (1.02, 0.351)]):
    tz = prim(f'zhuan_{i}', bpy.ops.mesh.primitive_torus_add, DEEP,
              major_radius=r + 0.008, minor_radius=0.010, major_segments=32, minor_segments=8, location=(0, 0, z))
    tz.scale = (1, SQ, 1)

# ---------- 导出 ----------
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_yup=True)
import os
print('GLB bytes:', os.path.getsize(OUT))
